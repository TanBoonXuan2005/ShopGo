import { Card, Button, Badge } from "react-bootstrap";
import { FaEdit, FaTrash, FaStar } from "react-icons/fa";


export default function ProductCard({ product, navigate, isOwner, onEdit, onDelete, onQuickAdd }) {
    return (
        <Card
            className="h-100 border-0 shadow-sm hover-shadow transition-all cursor-pointer"
            style={{ cursor: 'pointer' }}
            onClick={() => navigate && navigate(`/products/${product.id}`)}
        >
            <div className="position-relative" style={{ height: '200px' }}>
                <Card.Img
                    variant="top"
                    src={product.image_url || "https://via.placeholder.com/200"}
                    className="w-100 h-100 object-fit-cover"
                />
                {product.stock <= 0 && (
                    <div className="position-absolute top-0 start-0 w-100 h-100 bg-white opacity-50 d-flex align-items-center justify-content-center">
                        <Badge bg="dark">Out of Stock</Badge>
                    </div>
                )}
                {product.stock > 0 && product.stock < 3 && (
                    <div className="position-absolute top-0 end-0 p-2">
                        <Badge bg="danger" className="shadow-sm">Only {product.stock} left!</Badge>
                    </div>
                )}
            </div>

            <Card.Body className="d-flex flex-column p-3">
                <div className="d-flex justify-content-between align-items-start mb-2">
                    <Badge bg="light" text="secondary" className="fw-normal">{product.category || 'Product'}</Badge>
                    {product.average_rating > 0 && (
                        <small className="text-warning fw-bold d-flex align-items-center">
                            {parseFloat(product.average_rating).toFixed(1)} <FaStar className="ms-1" />
                        </small>
                    )}
                </div>

                <Card.Title className="fw-bold text-truncate mb-1" style={{ fontSize: '1rem' }}>{product.name}</Card.Title>
                <div className="mb-3">
                    {product.discount_percentage > 0 ? (
                        <div className="d-flex align-items-center flex-wrap">
                            <span className="text-danger fw-bold me-2" style={{ fontSize: '1.1rem' }}>RM{(parseFloat(product.price) * (1 - product.discount_percentage / 100)).toFixed(2)}</span>
                            <small className="text-muted text-decoration-line-through me-2">
                                RM{parseFloat(product.price).toFixed(2)}
                            </small>
                            <Badge bg="danger" pill>-{product.discount_percentage}%</Badge>
                        </div>
                    ) : (
                        <Card.Text className="text-danger fw-bold" style={{ fontSize: '1.1rem' }}>RM {parseFloat(product.price).toFixed(2)}</Card.Text>
                    )}
                </div>

                <div className="mt-auto d-flex justify-content-between align-items-center" onClick={(e) => e.stopPropagation()}>
                    <small className="text-muted">{product.items_sold || 0} sold</small>

                    {isOwner && (
                        <div className="d-flex gap-2">
                            <Button variant="light" size="sm" className="rounded-circle p-2 d-flex align-items-center justify-content-center" onClick={() => onEdit(product)}>
                                <FaEdit size={14} className="text-primary" />
                            </Button>
                            <Button variant="light" size="sm" className="rounded-circle p-2 d-flex align-items-center justify-content-center" onClick={() => onDelete(product.id)}>
                                <FaTrash size={14} className="text-danger" />
                            </Button>
                        </div>
                    )}

                    {onQuickAdd && !isOwner && (
                        <Button variant="outline-dark" size="sm" className="rounded-circle px-2" onClick={(e) => { e.stopPropagation(); onQuickAdd(e, product); }}>
                            +
                        </Button>
                    )}
                </div>
            </Card.Body>
        </Card>
    );
}