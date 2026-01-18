
import { useState, useRef, useEffect } from "react";
import { Button, Card, Form, Spinner, InputGroup } from "react-bootstrap";
import { FaCommentDots, FaPaperPlane, FaTimes, FaRobot } from "react-icons/fa";

export default function Chatbot() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'model', text: "Hi! 👋 I'm your ShopGo assistant. How can I help you today?" }
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    // Listen for custom event to open chat
    useEffect(() => {
        const handleOpen = () => setIsOpen(true);
        window.addEventListener('openChatbot', handleOpen);
        return () => window.removeEventListener('openChatbot', handleOpen);
    }, []);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMsg = { role: 'user', text: input };
        setMessages(prev => [...prev, userMsg]);
        setInput("");
        setLoading(true);

        try {
            const API_URL = 'http://localhost:5000'; // Ensure this matches your backend
            const response = await fetch(`${API_URL}/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: userMsg.text })
            });

            const data = await response.json();

            if (response.ok) {
                setMessages(prev => [...prev, { role: 'model', text: data.reply }]);
            } else {
                setMessages(prev => [...prev, { role: 'model', text: "Sorry, I'm having trouble connecting right now. 😓" }]);
            }
        } catch (error) {
            console.error("Chat error:", error);
            setMessages(prev => [...prev, { role: 'model', text: "Network error. Please try again later." }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="position-fixed bottom-0 end-0 p-4" style={{ zIndex: 9999 }}>
            {/* Chat Window */}
            {isOpen && (
                <Card className="shadow-lg border-0 mb-3" style={{ width: '350px', height: '500px', display: 'flex', flexDirection: 'column' }}>
                    <Card.Header className="bg-dark text-white d-flex justify-content-between align-items-center py-3">
                        <div className="d-flex align-items-center gap-2">
                            <FaRobot /> <strong>ShopGo Live Chat</strong>
                        </div>
                        <Button variant="link" className="text-white p-0" onClick={() => setIsOpen(false)}>
                            <FaTimes />
                        </Button>
                    </Card.Header>

                    <Card.Body className="flex-grow-1 overflow-auto bg-light p-3" style={{ scrollbarWidth: 'thin' }}>
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`d-flex mb-3 ${msg.role === 'user' ? 'justify-content-end' : 'justify-content-start'}`}>
                                <div
                                    className={`p-3 rounded-4 shadow-sm ${msg.role === 'user' ? 'bg-primary text-white' : 'bg-white text-dark border'}`}
                                    style={{ maxWidth: '80%', borderBottomRightRadius: msg.role === 'user' ? '4px' : '16px', borderBottomLeftRadius: msg.role === 'model' ? '4px' : '16px' }}
                                >
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="d-flex justify-content-start mb-3">
                                <div className="bg-white p-3 rounded-4 border shadow-sm">
                                    <Spinner animation="dots" size="sm" variant="dark" /> typing...
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </Card.Body>

                    <Card.Footer className="bg-white border-top p-3">
                        <Form onSubmit={handleSend}>
                            <InputGroup>
                                <Form.Control
                                    placeholder="Type a message..."
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    className="border-0 bg-light rounded-start-pill ps-3 focus-ring-none"
                                    style={{ boxShadow: 'none' }}
                                />
                                <Button variant="dark" type="submit" className="rounded-end-pill px-3" disabled={loading}>
                                    <FaPaperPlane />
                                </Button>
                            </InputGroup>
                        </Form>
                    </Card.Footer>
                </Card>
            )}

            {/* Toggle Button */}
            {!isOpen && (
                <Button
                    variant="dark"
                    className="rounded-circle shadow-lg d-flex align-items-center justify-content-center hover-scale"
                    style={{ width: '60px', height: '60px' }}
                    onClick={() => setIsOpen(true)}
                >
                    <FaCommentDots size={28} />
                </Button>
            )}
        </div>
    );
}
