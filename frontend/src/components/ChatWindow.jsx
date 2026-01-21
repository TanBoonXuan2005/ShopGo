import { useState, useEffect, useRef } from 'react';
import { Form, Button, InputGroup, Spinner } from 'react-bootstrap';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { FaPaperPlane } from 'react-icons/fa';

export default function ChatWindow({ chatId, currentUser }) {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    // load messages real-time
    useEffect(() => {
        if (!chatId) return;

        const q = query(
            collection(db, "chats", chatId, "messages"),
            orderBy("createdAt", "asc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setMessages(msgs);
            // Scroll to bottom on new message
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
        });

        return () => unsubscribe();
    }, [chatId]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        setLoading(true);
        try {
            // 1. Add message to subcollection
            await addDoc(collection(db, "chats", chatId, "messages"), {
                text: newMessage,
                senderId: currentUser.uid,
                createdAt: serverTimestamp(),
                read: false
            });

            // 2. Update/Set last message in parent chat doc (Safe handling)
            // Parse participants from chatId if doc is missing
            const participants = chatId.split('_');

            await setDoc(doc(db, "chats", chatId), {
                lastMessage: {
                    text: newMessage,
                    senderId: currentUser.uid,
                    sentAt: serverTimestamp()
                },
                updatedAt: serverTimestamp(),
                participants: participants // Ensure participants exist for query
            }, { merge: true });

            setNewMessage("");
        } catch (err) {
            console.error("Error sending message:", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="d-flex flex-column h-100 bg-white rounded shadow-sm overflow-hidden" style={{ minHeight: '500px', maxHeight: '80vh' }}>
            {/* Messages Area */}
            <div className="flex-grow-1 p-3 overflow-auto bg-light" style={{ minHeight: '300px' }}>
                {messages.length === 0 ? (
                    <div className="text-center text-muted mt-5">
                        <small>No messages yet. Say hello! 👋</small>
                    </div>
                ) : (
                    messages.map(msg => {
                        const isMe = msg.senderId === currentUser.uid;
                        return (
                            <div key={msg.id} className={`d-flex mb-3 ${isMe ? 'justify-content-end' : 'justify-content-start'}`}>
                                <div
                                    className={`p-3 shadow-sm ${isMe ? 'bg-primary text-white' : 'bg-white text-dark border'}`}
                                    style={{
                                        maxWidth: '75%',
                                        borderRadius: '15px',
                                        borderBottomRightRadius: isMe ? '4px' : '15px',
                                        borderBottomLeftRadius: !isMe ? '4px' : '15px'
                                    }}
                                >
                                    <p className="mb-0">{msg.text}</p>
                                    <small className={`d-block text-end mt-1 ${isMe ? 'text-white-50' : 'text-muted'}`} style={{ fontSize: '0.7rem' }}>
                                        {msg.createdAt?.seconds ? new Date(msg.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Sending...'}
                                    </small>
                                </div>
                            </div>
                        )
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 bg-white border-top">
                <Form onSubmit={handleSendMessage}>
                    <InputGroup>
                        <Form.Control
                            placeholder="Type a message..."
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            className="border-0 bg-light rounded-start-pill ps-3"
                        />
                        <Button variant="dark" type="submit" className="rounded-end-pill px-3" disabled={loading}>
                            {loading ? <Spinner size="sm" animation="border" /> : <FaPaperPlane />}
                        </Button>
                    </InputGroup>
                </Form>
            </div>
        </div>
    );
}
