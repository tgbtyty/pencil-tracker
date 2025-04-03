import './ItemCounter.css';

function ItemCounter({ count }) {
  return (
    <div className="item-counter">
      <span className="count">{count}</span>
      <span className="label">Items Detected</span>
    </div>
  );
}

export default ItemCounter;