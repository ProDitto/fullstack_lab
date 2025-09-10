package util

import (
	"github.com/jackc/pgx/v5"
	"golang.org/x/exp/slog"
)

// CustomLogger implements pgx.Logger interface
type CustomLogger struct {
	slog *slog.Logger
}

var _ pgx.Conn = nil

// func (l *CustomLogger) Log(ctx context.Context, level pgx.LogLevel, msg string, data map[string]any) {
// 	var slogLevel slog.Level
// 	switch level {
// 	case pgx.LogLevelTrace, pgx.LogLevelDebug:
// 		slogLevel = slog.LevelDebug
// 	case pgx.LogLevelInfo:
// 		slogLevel = slog.LevelInfo
// 	case pgx.LogLevelWarn:
// 		slogLevel = slog.LevelWarn
// 	case pgx.LogLevelError:
// 		slogLevel = slog.LevelError
// 	default:
// 		slogLevel = slog.LevelDebug
// 	}
// 	l.slog.Log(slogLevel, msg)
// }

// func main() {
//     // Setup slog
//     logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
//         Level: slog.LevelDebug,
//     }))

//     // Setup pgx config
//     config, err := pgx.ParseConfig("postgres://user:password@localhost:5432/mydb")
//     if err != nil {
//         panic(err)
//     }

//     // Assign your custom logger
//     config.Logger = &CustomLogger{slog: logger}

//     // Connect
//     conn, err := pgx.ConnectConfig(context.Background(), config)
//     if err != nil {
//         panic(err)
//     }
//     defer conn.Close(context.Background())

//     // Run a query
//     var greeting string
//     err = conn.QueryRow(context.Background(), "SELECT 'Hello, world!'").Scan(&greeting)
//     if err != nil {
//         panic(err)
//     }
//     println(greeting)
// }
