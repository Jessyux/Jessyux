# Online chat (design)

## Intent
Friends playing a Whisker Isles game online can talk to each other. Live only, nothing kept after the game.

## Goals
- A chat button beside the sound and music buttons, in the strip between the two paws. It opens a box with each message shown with the sender's sticker avatar and name, and a "Bean is typing..." line.
- Works for everyone seated in an online game. Unread count on the button and a one-line preview while the box is closed. A tab-title flash when the tab is hidden.
- Swearing is allowed: no word filter (Jessy's call).

## Non-goals / anti-goals
- No saving. Messages never enter the game state or the saved game, and are forgotten when the game ends or Play again starts. A late joiner or reconnect gets only the last 30 held in the room's memory.
- No push notifications, no links made clickable, no images.
- In-person (one screen) play has no chat. This is the one exception to the rule that online features also work in person, because chat is between devices.

## Approaches
- **Relay only (chosen):** the room passes `chat` and `typing` messages to everyone and keeps a short in-memory backlog. Nothing stored.
- Chat inside game state: rejected. It is saved with the game and sent with every move.

## Design
- Client to server: `chat {text}` and `typing {on}`. Server to client: `chat {msg:{id, from, text, t}}`, `chatlog {msgs}` after hello, `typing {from, on}`. `from` is the seat's public id.
- Text is trimmed, whitespace collapsed, control characters removed, 140 characters at most. One message per 700 ms per device. Seated players only.
- Typing signals expire on the client after 4 s.
- Backlog is cleared when Play again returns the room to its lobby.

## Left to the builder
Exact box styling, sounds (none), how the preview bubble looks.
