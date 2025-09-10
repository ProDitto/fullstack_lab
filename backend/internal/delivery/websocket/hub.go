package websocket

import (
	"context"
	"encoding/json"
	"log/slog"
	"sync"

	"chatterbox/internal/api"
	"chatterbox/internal/domain"
	"chatterbox/internal/repository"
	"chatterbox/internal/usecase"

	"github.com/google/uuid"
)

type Hub struct {
	clients       map[*Client]bool
	broadcast     chan []byte
	Register      chan *Client
	Unregister    chan *Client
	userClients   map[uuid.UUID]map[*Client]bool
	messageUsecase usecase.MessageUsecase
	friendRepo    repository.FriendRepository
	wsMessagePool sync.Pool
	mu            sync.RWMutex
}

func NewHub(messageUsecase usecase.MessageUsecase, friendRepo repository.FriendRepository) *Hub {
	return &Hub{
		broadcast:     make(chan []byte),
		Register:      make(chan *Client),
		Unregister:    make(chan *Client),
		clients:       make(map[*Client]bool),
		userClients:   make(map[uuid.UUID]map[*Client]bool),
		messageUsecase: messageUsecase,
		friendRepo:    friendRepo,
		wsMessagePool: sync.Pool{
			New: func() interface{} {
				return &api.WebsocketMessage{}
			},
		},
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.Register:
			h.registerClient(client)
		case client := <-h.Unregister:
			h.unregisterClient(client)
		case message := <-h.broadcast:
			h.mu.RLock()
			for client := range h.clients {
				select {
				case client.send <- message:
				default:
					close(client.send)
					delete(h.clients, client)
				}
			}
			h.mu.RUnlock()
		}
	}
}

func (h *Hub) registerClient(client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.clients[client] = true
	if h.userClients[client.UserID] == nil {
		h.userClients[client.UserID] = make(map[*Client]bool)
	}
	h.userClients[client.UserID][client] = true
	slog.Info("Client registered", "userID", client.UserID, "totalClients", len(h.clients))
}

func (h *Hub) unregisterClient(client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if _, ok := h.clients[client]; ok {
		delete(h.clients, client)
		close(client.send)
		if userClients, userExists := h.userClients[client.UserID]; userExists {
			delete(userClients, client)
			if len(userClients) == 0 {
				delete(h.userClients, client.UserID)
			}
		}
		slog.Info("Client unregistered", "userID", client.UserID, "totalClients", len(h.clients))
	}
}

func (h *Hub) sendToUser(userID uuid.UUID, message []byte) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	if clients, ok := h.userClients[userID]; ok {
		for client := range clients {
			select {
			case client.send <- message:
			default:
				// Client's send buffer is full, connection might be slow.
				// For this app, we'll just drop the message.
				slog.Warn("client send buffer full, message dropped", "userID", client.UserID)
			}
		}
	}
}

func (h *Hub) handleMessage(sender *Client, msg api.WebsocketMessage) {
	ctx := context.Background() // Use a proper context in a real app
	switch msg.Type {
	case "NEW_MESSAGE":
		h.handleNewMessage(ctx, sender, msg.Payload)
	case "MESSAGE_ACK":
		h.handleMessageAck(ctx, sender, msg.Payload)
	}
}

func (h *Hub) handleNewMessage(ctx context.Context, sender *Client, payload interface{}) {
	payloadBytes, _ := json.Marshal(payload)
	var p api.NewMessagePayload
	if err := json.Unmarshal(payloadBytes, &p); err != nil {
		slog.Error("failed to unmarshal new message payload", "error", err)
		return
	}

	domainMsg := &domain.Message{
		SenderID:    sender.UserID,
		RecipientID: p.RecipientID,
		GroupID:     p.GroupID,
		Content:     p.Content,
	}

	processedMsg, err := h.messageUsecase.ProcessAndRouteMessage(ctx, domainMsg)
	if err != nil {
		slog.Error("failed to process message", "error", err)
		return
	}

	// Acknowledge to sender that the message was received by the server
	ackPayload := api.MessageSentAckPayload{TempID: p.TempID, MessageID: processedMsg.ID, CreatedAt: processedMsg.CreatedAt}
	ackMsg := api.WebsocketMessage{Type: "MESSAGE_SENT_ACK", Payload: ackPayload}
	ackBytes, _ := json.Marshal(ackMsg)
	sender.send <- ackBytes

	// Route the message to recipient(s)
	newMsgPayload := api.MessageDTO{ID: processedMsg.ID, SenderID: processedMsg.SenderID, RecipientID: processedMsg.RecipientID, GroupID: processedMsg.GroupID, Content: processedMsg.Content, Status: string(processedMsg.Status), CreatedAt: processedMsg.CreatedAt}
	newMsg := api.WebsocketMessage{Type: "NEW_MESSAGE", Payload: newMsgPayload}
	newMsgBytes, _ := json.Marshal(newMsg)

	if p.RecipientID != nil {
		// 1-to-1 message
		isBlocked, err := h.friendRepo.IsBlocked(ctx, sender.UserID, *p.RecipientID)
		if err != nil {
			slog.Error("failed to check block status", "error", err)
			return
		}
		if !isBlocked {
			h.sendToUser(*p.RecipientID, newMsgBytes)
		}
	} else if p.GroupID != nil {
		// Group message logic would go here
		// h.sendToGroup(*p.GroupID, newMsgBytes)
	}
}

func (h *Hub) handleMessageAck(ctx context.Context, sender *Client, payload interface{}) {
	payloadBytes, _ := json.Marshal(payload)
	var p api.AckPayload
	if err := json.Unmarshal(payloadBytes, &p); err != nil {
		slog.Error("failed to unmarshal ack payload", "error", err)
		return
	}

	if p.Status == string(domain.MessageStatusDelivered) {
		err := h.messageUsecase.ConfirmDelivery(ctx, p.MessageID)
		if err != nil {
			slog.Error("failed to confirm message delivery", "error", err, "messageId", p.MessageID)
		} else {
			slog.Info("confirmed message delivery", "messageId", p.MessageID)
		}
	}
	// 'seen' status can be propagated to the sender here if needed
}
