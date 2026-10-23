import { useState, useEffect } from 'react';
import { apiRequest } from '../api/api';
import { useAuth } from '../context/AuthContext';

export default function Products() {
  const { user, token } = useAuth();
  const [products, setProducts] = useState([]);
  const [cart,     setCart]     = useState({});
  const [msg,      setMsg]      = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(true);
  const [ordering, setOrdering] = useState(false);

  useEffect(() => {
    apiRequest('/products')
      .then(d => setProducts(d.products))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const addToCart = id => setCart(c => ({ ...c, [id]: (c[id] || 0) + 1 }));
  const removeFromCart = id => setCart(c => {
    const n = { ...c };
    if (n[id] > 1) n[id]--;
    else delete n[id];
    return n;
  });

  const placeOrder = async () => {
    const items = Object.entries(cart).map(([productId, quantity]) => ({ productId: parseInt(productId), quantity }));
    if (items.length === 0) return setError('Add at least one item to cart.');
    setMsg(''); setError(''); setOrdering(true);
    try {
      const data = await apiRequest('/orders', 'POST', {
        userId: user.id,
        items,
        shippingAddress: '12 Demo Street',
        shippingCity: 'Mumbai',
        shippingState: 'Maharashtra',
        shippingPostal: '400001'
      }, token);
      setMsg(`Order #${data.orderId} placed! Total: ₹${data.totalAmount}`);
      setCart({});
    } catch (err) {
      setError(err.message);
    } finally {
      setOrdering(false);
    }
  };

  if (loading) return <div className="loading">Loading products...</div>;

  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);

  return (
    <div>
      <div className="page-header">
        <h1>Products & Services</h1>
        <p>Browse and order DemoApp services</p>
      </div>

      {msg   && <div className="alert alert-success">{msg}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="product-grid">
        {products.map(p => (
          <div className="product-card" key={p.id}>
            <span className="category">{p.category}</span>
            <h4>{p.name}</h4>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{p.description}</p>
            <span className="price">₹{parseFloat(p.price).toFixed(2)}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => removeFromCart(p.id)}>−</button>
              <span style={{ minWidth: '24px', textAlign: 'center', fontWeight: 600 }}>{cart[p.id] || 0}</span>
              <button className="btn btn-primary btn-sm" style={{ width: 'auto' }} onClick={() => addToCart(p.id)}>+</button>
            </div>
          </div>
        ))}
      </div>

      {cartCount > 0 && (
        <div className="card" style={{ marginTop: '1.5rem', maxWidth: '480px' }}>
          <h3>Cart Summary ({cartCount} item{cartCount > 1 ? 's' : ''})</h3>
          {Object.entries(cart).map(([id, qty]) => {
            const p = products.find(x => x.id === parseInt(id));
            return p ? (
              <div key={id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)', fontSize: '0.88rem' }}>
                <span>{p.name} × {qty}</span>
                <span style={{ fontWeight: 600 }}>₹{(parseFloat(p.price) * qty).toFixed(2)}</span>
              </div>
            ) : null;
          })}
          <button className="btn btn-primary" style={{ marginTop: '1.25rem', width: '100%', padding: '10px 24px' }} onClick={placeOrder} disabled={ordering}>
            {ordering ? 'Placing Order...' : 'Confirm & Place Order'}
          </button>
        </div>
      )}
    </div>
  );
}
