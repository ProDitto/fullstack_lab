DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_groups_updated_at ON groups;
DROP TRIGGER IF EXISTS update_friend_requests_updated_at ON friend_requests;

DROP FUNCTION IF EXISTS update_updated_at_column();

DROP TABLE IF EXISTS unsent_messages;
DROP TABLE IF EXISTS blocked_users;
DROP TABLE IF EXISTS friends;
DROP TABLE IF EXISTS friend_requests;
DROP TABLE IF EXISTS group_members;
DROP TABLE IF EXISTS groups;
DROP TABLE IF EXISTS users;

DROP TYPE IF EXISTS message_status;
DROP TYPE IF EXISTS friend_request_status;

DROP EXTENSION IF EXISTS "uuid-ossp";
