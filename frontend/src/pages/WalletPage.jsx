import { useState, useContext, useEffect } from 'react';
import { Container, Card, Row, Col, Button, Form, Spinner, Alert } from 'react-bootstrap';
import { AuthContext } from '../components/AuthProvider';
import { FaWallet, FaPlus, FaMoneyBillWave, FaHistory } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

export default function WalletPage() {
    const { currentUser } = useContext(AuthContext);
    const navigate = useNavigate();

    const [balance, setBalance] = useState(0);
    const [loading, setLoading] = useState(true);
    const [topUpAmount, setTopUpAmount] = useState('');
    const [customAmount, setCustomAmount] = useState('');
    const [processing, setProcessing] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const API_URL = 'http://localhost:5000';

    useEffect(() => {
        if (currentUser) {
            fetchBalance();
        } else {
            navigate('/login');
        }
    }, [currentUser, navigate]);

    const fetchBalance = async () => {
        try {
            const response = await fetch(`${API_URL}/wallet/${currentUser.uid}`);
            if (response.ok) {
                const data = await response.json();
                setBalance(data.balance);
            }
        } catch (error) {
            console.error("Error fetching balance:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleTopUp = async () => {
        const amount = customAmount ? parseFloat(customAmount) : parseFloat(topUpAmount);

        if (!amount || amount <= 0) {
            setMessage({ type: 'danger', text: 'Please select or enter a valid amount.' });
            return;
        }

        setProcessing(true);
        setMessage({ type: '', text: '' });

        try {
            const response = await fetch(`${API_URL}/wallet/topup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: currentUser.uid, amount }),
            });

            const data = await response.json();

            if (response.ok) {
                setMessage({ type: 'success', text: `Successfully topped up $${amount.toFixed(2)}!` });
                setBalance(parseFloat(data.newBalance));
                setTopUpAmount('');
                setCustomAmount('');
            } else {
                setMessage({ type: 'danger', text: data.error || 'Top up failed.' });
            }
        } catch (error) {
            console.error("Top up error:", error);
            setMessage({ type: 'danger', text: 'Network error. Please try again.' });
        } finally {
            setProcessing(false);
        }
    };

    const PRESET_AMOUNTS = [10, 20, 50, 100];

    if (loading) return <Container className="py-5 text-center"><Spinner animation="border" /></Container>;

    return (
        <Container className="py-5" style={{ maxWidth: '800px', minHeight: '80vh' }}>
            <div className="mb-5 text-center">
                <h2 className="fw-bolder display-6 mb-2">My Wallet</h2>
                <p className="text-muted">Manage your funds and transactions.</p>
            </div>

            <Row className="g-4">
                {/* BALANCE CARD */}
                <Col md={12}>
                    <Card className="border-0 shadow-lg rounded-4 overflow-hidden bg-dark text-white p-4 p-md-5 text-center position-relative">
                        <div className="position-absolute top-0 start-0 w-100 h-100 opacity-25" style={{ background: 'linear-gradient(45deg, #000 0%, #333 100%)' }}></div>
                        <div className="position-relative z-1">
                            <h5 className="text-white-50 fw-bold mb-3 ls-1">CURRENT BALANCE</h5>
                            <h1 className="display-3 fw-bolder mb-0">${balance.toFixed(2)}</h1>
                        </div>
                    </Card>
                </Col>

                {/* TOP UP SECTION */}
                <Col md={12}>
                    <Card className="border-0 shadow-sm rounded-4 p-4 p-md-5 bg-white">
                        <h4 className="fw-bold mb-4 d-flex align-items-center">
                            <span className="bg-light p-2 rounded-circle me-3"><FaPlus className="text-dark" size={20} /></span>
                            Top Up Funds
                        </h4>

                        {message.text && <Alert variant={message.type} className="rounded-3 border-0 shadow-sm mb-4">{message.text}</Alert>}

                        <div className="mb-4">
                            <p className="fw-bold text-muted small mb-3">SELECT AMOUNT</p>
                            <div className="d-flex flex-wrap gap-3">
                                {PRESET_AMOUNTS.map(amt => (
                                    <Button
                                        key={amt}
                                        variant={topUpAmount === amt && !customAmount ? 'dark' : 'outline-light text-dark border-2'}
                                        className="py-3 px-4 rounded-3 fw-bold flex-grow-1"
                                        onClick={() => { setTopUpAmount(amt); setCustomAmount(''); }}
                                    >
                                        ${amt}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        <div className="mb-4">
                            <p className="fw-bold text-muted small mb-3">OR ENTER CUSTOM AMOUNT</p>
                            <Form.Control
                                type="number"
                                placeholder="0.00"
                                value={customAmount}
                                onChange={(e) => { setCustomAmount(e.target.value); setTopUpAmount(''); }}
                                className="bg-light border-0 py-3 px-4 rounded-3 fs-5 fw-bold"
                            />
                        </div>

                        <div className="d-grid mt-5">
                            <Button
                                variant="dark"
                                size="lg"
                                className="py-3 rounded-pill fw-bold shadow hover-scale transition-all"
                                onClick={handleTopUp}
                                disabled={processing || (!topUpAmount && !customAmount)}
                            >
                                {processing ? <Spinner size="sm" /> : "Confirm Top Up"}
                            </Button>
                        </div>
                    </Card>
                </Col>
            </Row>

            <style jsx>{`
                .ls-1 { letter-spacing: 2px; }
                .hover-scale:hover { transform: scale(1.02); transition: transform 0.2s; }
            `}</style>
        </Container>
    );
}
