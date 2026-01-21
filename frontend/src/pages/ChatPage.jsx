import { useContext, useEffect, useState } from "react";
import { Container, Row, Col, ListGroup, Spinner, Badge, Button, Image, Modal } from "react-bootstrap";
import { useParams, useNavigate } from "react-router-dom";
import { collection, query, where, onSnapshot, doc, updateDoc, arrayRemove } from "firebase/firestore";
import { db } from "../firebase";
import { AuthContext } from "../components/AuthProvider"; 
import ChatWindow from "../components/ChatWindow";
import { FaArrowLeft, FaTrash } from "react-icons/fa";

export default function ChatPage() {
    const { chatId } = useParams();
    const navigate = useNavigate();
    const { currentUser } = useContext(AuthContext); 
    const [chats, setChats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [profiles, setProfiles] = useState({}); 

    // Modal State
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [chatToDelete, setChatToDelete] = useState(null);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [modalMessage, setModalMessage] = useState("");


    // 1. Redirect if not logged in (Effect only for redirect)
    useEffect(() => {
        if (!currentUser) {
            navigate("/login");
        }
    }, [currentUser, navigate]);

    // 2. Load User's Chats
    useEffect(() => {
        if (!currentUser) return;



        // Safety Timeout - Warn if Firestore hangs for > 30s, but don't kill it (might be slow network)


        const q = query(
            collection(db, "chats"),
            where("participants", "array-contains", currentUser.uid)
            // orderBy("updatedAt", "desc") 
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {

            const chatList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            // Manual sort on client side since we removed orderBy
            chatList.sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0));

            setChats(chatList);
            setLoading(false);
        }, (err) => {

            console.error("ChatPage: Snapshot Error", err);
            setLoading(false);
        });

        return () => {
            unsubscribe();

        };
    }, [currentUser]);

    // 3. Fetch User Profiles
    useEffect(() => {
        const fetchProfiles = async () => {
            const newProfiles = { ...profiles };
            let needsUpdate = false;

            for (const chat of chats) {
                let otherUid = chat.participants.find(uid => uid !== currentUser.uid);

                // If otherUid is missing, check if it's a self-chat
                if (!otherUid && chat.participants.includes(currentUser.uid)) {
                    otherUid = currentUser.uid;
                }

                if (!otherUid) continue;

                // Handle Test User explicitly
                if (otherUid === 'test_user') {
                    if (!newProfiles['test_user']) {
                        newProfiles['test_user'] = { store_name: "Test User", role: "system" };
                        needsUpdate = true;
                    }
                    continue;
                }

                if (!newProfiles[otherUid]) {
                    try {
                        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
                        const res = await fetch(`${API_URL}/sellers/${otherUid}`);
                        if (res.ok) {
                            const data = await res.json();
                            newProfiles[otherUid] = data;
                            needsUpdate = true;
                        } else {
                            // If 404 or other error, set a fallback so we don't keep trying and showing "Loading..."
                            newProfiles[otherUid] = { store_name: "Unknown User", role: "guest" };
                            needsUpdate = true;
                        }
                    } catch (err) {
                        console.error("Failed to fetch profile for", otherUid, err);
                        // Fallback on catch
                        newProfiles[otherUid] = { store_name: "Unknown User", role: "guest" };
                        needsUpdate = true;
                    }
                }
            }

            if (needsUpdate) {
                setProfiles(newProfiles);
            }
        };

        if (chats.length > 0 && currentUser) {
            fetchProfiles();
        }
    }, [chats, currentUser]);

    // Helper to get formatted date
    const formatDate = (timestamp) => {
        if (!timestamp) return "";
        const date = new Date(timestamp.seconds * 1000);
        return date.toLocaleDateString() === new Date().toLocaleDateString()
            ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : date.toLocaleDateString();
    };

    if (loading) {
        return (
            <Container className="py-5 text-center">
                <Spinner animation="border" />
                <p className="text-muted mt-2">Loading chats...</p>
                <div className="mt-3">
                    <small className="text-warning">If this takes longer than 5 seconds, please check your network.</small>
                </div>
            </Container>
        );
    }

    // Modal State


    // 1. Open Modal
    const handleDeleteChat = (chatId, e) => {
        e.stopPropagation();
        setChatToDelete(chatId);
        setShowDeleteModal(true);
    };

    // 2. Confirm Delete
    const confirmDeleteChat = async () => {
        if (!chatToDelete) return;

        try {
            const chatRef = doc(db, "chats", chatToDelete);
            await updateDoc(chatRef, {
                participants: arrayRemove(currentUser.uid)
            });

            if (chatToDelete === chatId) {
                navigate('/chat');
            }
            setShowDeleteModal(false);
            setChatToDelete(null);
        } catch (err) {
            console.error("Error deleting chat:", err);
            setModalMessage("Failed to delete chat.");
            setShowErrorModal(true);
        }
    };

    // Helper: Avatar Generator
    const renderAvatar = (profile, uid, size = 50) => {
        let imageUrl = profile?.store_image_url || profile?.profile_image_url;
        let name = profile?.store_name || profile?.username || profile?.email || "U";

        // Improve fallback for "Me (Self)" or null profile
        // If the uid is the current user, try to use the AuthContext data directly if profile fetch failed/delayed
        if (uid === currentUser?.uid) {
            if (!imageUrl) imageUrl = currentUser.photoURL || currentUser.store_image_url || currentUser.profile_image_url;
            if (name === "U" || name === "Unknown User") name = currentUser.displayName || currentUser.store_name || currentUser.username || "Me";
        }

        if (imageUrl) {
            return (
                <Image
                    src={imageUrl}
                    roundedCircle
                    width={size}
                    height={size}
                    className="object-fit-cover shadow-sm border"
                />
            );
        }

        // Generate color based on name/uid
        const colors = ['#FF5733', '#33FF57', '#3357FF', '#F033FF', '#FF33A8', '#FF8C33', '#33FFF2'];
        const seedStr = uid || name;
        const seed = seedStr.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const color = colors[seed % colors.length];
        const letter = name.charAt(0).toUpperCase();

        return (
            <div
                className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold shadow-sm"
                style={{ width: size, height: size, backgroundColor: color, fontSize: size * 0.4 }}
            >
                {letter}
            </div>
        );
    };

    return (
        <Container className="py-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="fw-bold mb-0">Messages</h2>
            </div>
            <Row className="g-0 border rounded overflow-hidden shadow-sm" style={{ minHeight: '70vh' }}>

                {/* LIST COLUMN: Visible on desktop, or on mobile if no chat selected */}
                <Col md={4} className={`bg-light border-end ${chatId ? 'd-none d-md-block' : 'd-block'}`}>
                    <div className="p-3 border-bottom bg-white">
                        <h6 className="mb-0 fw-bold">Recent Chats</h6>
                    </div>
                    <ListGroup variant="flush" className="overflow-auto" style={{ maxHeight: '70vh' }}>
                        {chats.length === 0 ? (
                            <div className="p-4 text-center text-muted">
                                <small>No conversations yet.</small>
                            </div>
                        ) : (
                            chats.map(chat => {
                                const isActive = chat.id === chatId;
                                let otherUid = chat.participants.find(uid => uid !== currentUser.uid);

                                // Self-Chat Fallback (User chatting with themselves)
                                if (!otherUid && chat.participants.includes(currentUser.uid)) {
                                    otherUid = currentUser.uid;
                                }

                                const profile = profiles[otherUid];
                                let displayName = profile?.store_name || profile?.username || profile?.email || "Unknown User";
                                if (otherUid === currentUser.uid) {
                                    displayName = `${displayName} (Self)`;
                                }

                                return (
                                    <ListGroup.Item
                                        key={chat.id}
                                        as="div"
                                        action
                                        active={isActive}
                                        onClick={() => navigate(`/chat/${chat.id}`)}
                                        className="border-0 border-bottom py-3 cursor-pointer"
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <div className="d-flex align-items-center mb-2">
                                            {/* Avatar */}
                                            <div className="me-3 position-relative">
                                                {renderAvatar(profile, otherUid)}
                                            </div>

                                            <div className="flex-grow-1 overflow-hidden">
                                                <div className="d-flex justify-content-between align-items-center mb-1">
                                                    <strong className="text-truncate" style={{ maxWidth: '140px' }}>
                                                        {displayName}
                                                    </strong>
                                                    <small className={isActive ? "text-white-50" : "text-muted"} style={{ fontSize: '0.75rem' }}>
                                                        {formatDate(chat.updatedAt)}
                                                    </small>
                                                </div>
                                                <p className={`mb-0 small text-truncate ${isActive ? "text-white-50" : "text-muted"}`}>
                                                    {chat.lastMessage?.senderId === currentUser.uid ? 'You: ' : ''}
                                                    {chat.lastMessage?.text || "Started a chat"}
                                                </p>
                                            </div>

                                            <Button
                                                variant="link"
                                                className="text-muted p-2 ms-2 hover-danger"
                                                onClick={(e) => handleDeleteChat(chat.id, e)}
                                                title="Delete Chat"
                                            >
                                                <FaTrash size={14} />
                                            </Button>
                                        </div>
                                    </ListGroup.Item>
                                );
                            })
                        )}
                    </ListGroup>
                </Col>

                {/* WINDOW COLUMN: Visible on desktop, or on mobile if chat selected */}
                <Col md={8} className={`d-flex flex-column bg-white ${chatId ? 'd-block' : 'd-none d-md-flex'}`}>
                    {chatId ? (
                        <>
                            {/* Chat Header */}
                            <div className="p-3 border-bottom d-flex align-items-center gap-3 bg-light">
                                <div className="d-md-none">
                                    <Button variant="link" className="p-0 text-dark" onClick={() => navigate('/chat')}>
                                        <FaArrowLeft />
                                    </Button>
                                </div>
                                {(() => {
                                    // Resolve profile for header
                                    let otherUid = chatId.split('_').find(uid => uid !== currentUser.uid);
                                    if (!otherUid && chatId.includes(currentUser.uid)) otherUid = currentUser.uid;

                                    const profile = profiles[otherUid];
                                    let displayName = profile?.store_name || profile?.username || profile?.email || "User";
                                    if (otherUid === currentUser.uid) {
                                        displayName = `${displayName} (Self)`;
                                    }

                                    return (
                                        <div className="d-flex align-items-center gap-2">
                                            {renderAvatar(profile, otherUid, 40)}
                                            <div>
                                                <h6 className="mb-0 fw-bold">{displayName}</h6>
                                                {profile?.role === 'seller' && <Badge bg="warning" text="dark" className="ms-1" style={{ fontSize: '0.6rem' }}>SELLER</Badge>}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                            <ChatWindow chatId={chatId} currentUser={currentUser} />
                        </>
                    ) : (
                        <div className="d-flex flex-column align-items-center justify-content-center h-100 text-muted p-5">
                            <h4 className="fw-bold">Select a conversation</h4>
                            <p>Choose a chat from the left to start messaging.</p>
                        </div>
                    )}
                </Col>
            </Row>

            {/* DELETE CONFIRMATION MODAL */}
            <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered size="sm">
                <Modal.Body className="text-center p-4">
                    <div className="mb-3 text-danger bg-danger bg-opacity-10 rounded-circle d-inline-flex p-3">
                        <FaTrash size={24} />
                    </div>
                    <h5 className="fw-bold mb-2">Delete Conversation?</h5>
                    <p className="text-muted small mb-4">
                        This will remove the chat from your list. Other participants will still see the history.
                    </p>
                    <div className="d-flex gap-2 justify-content-center">
                        <Button variant="light" onClick={() => setShowDeleteModal(false)} className="rounded-pill px-4 fw-bold">
                            Cancel
                        </Button>
                        <Button variant="danger" onClick={confirmDeleteChat} className="rounded-pill px-4 fw-bold">
                            Delete
                        </Button>
                    </div>
                </Modal.Body>
            </Modal>

            {/* Error Modal */}
            <Modal show={showErrorModal} onHide={() => setShowErrorModal(false)} centered>
                <Modal.Header closeButton className="border-0">
                    <Modal.Title className="fw-bold text-danger">Error</Modal.Title>
                </Modal.Header>
                <Modal.Body className="pt-0">
                    <p className="text-muted">{modalMessage}</p>
                </Modal.Body>
                <Modal.Footer className="border-0">
                    <Button variant="secondary" size="sm" onClick={() => setShowErrorModal(false)}>Close</Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
}
