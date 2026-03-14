import { Card, Button, Badge } from 'react-bootstrap';
import { FaTicketAlt } from 'react-icons/fa';

export default function VoucherCard({ voucher, isClaimed, onClaim, onSelect, isSelected, disabled }) {

    // Format Display
    const title = voucher.discount_type === 'percentage'
        ? `${parseInt(voucher.discount_value)}% OFF`
        : `RM${parseInt(voucher.discount_value)} OFF`;

    const subtitle = `Min. Spend RM${parseInt(voucher.min_spend)}`;

    return (
        <Card className={`border-0 shadow-sm mb-3 overflow-hidden ${isSelected ? 'border border-primary bg-primary bg-opacity-10' : ''}`} style={{ transition: 'all 0.2s' }}>
            <Card.Body className="p-0 d-flex">
                {/* Left Ticket Stub Design */}
                <div className="bg-warning p-3 d-flex flex-column align-items-center justify-content-center text-white" style={{ width: '100px', borderRight: '2px dashed white' }}>
                    <FaTicketAlt size={24} className="mb-2" />
                    <small className="fw-bold">VOUCHER</small>
                </div>

                {/* Right Content */}
                <div className="p-3 flex-grow-1 d-flex justify-content-between align-items-center">
                    <div>
                        <h5 className="fw-bold text-danger mb-1">{title}</h5>
                        <div className="text-muted small mb-1">{subtitle}</div>
                        <Badge bg="light" text="secondary" className="border fw-normal">{voucher.code}</Badge>
                    </div>

                    <div className="text-end">
                        {onClaim && (
                            <Button
                                variant={isClaimed ? "secondary" : "danger"}
                                size="sm"
                                disabled={isClaimed || disabled}
                                onClick={() => onClaim(voucher.id)}
                            >
                                {isClaimed ? "Claimed" : "Claim"}
                            </Button>
                        )}

                        {onSelect && (
                            <Button
                                variant={isSelected ? "success" : "outline-dark"}
                                size="sm"
                                disabled={disabled}
                                onClick={() => onSelect(voucher)}
                            >
                                {isSelected ? "Selected" : "Use"}
                            </Button>
                        )}
                    </div>
                </div>
            </Card.Body>
        </Card>
    );
}
