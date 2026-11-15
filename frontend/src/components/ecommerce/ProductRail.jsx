import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function ProductRail({ label, children }) {
  const track = useRef(null);
  const [edges, setEdges] = useState({ start: true, end: true });

  useEffect(() => {
    const el = track.current;
    const update = () => setEdges({
      start: el.scrollLeft <= 2,
      end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2,
    });
    el.addEventListener('scroll', update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => { el.removeEventListener('scroll', update); observer.disconnect(); };
  }, [children]);

  const move = direction => track.current.scrollBy({ left: direction * track.current.clientWidth * 0.85, behavior: 'smooth' });

  return <div className="shop-rail">
    <button className="shop-rail-arrow is-prev" onClick={() => move(-1)} disabled={edges.start} aria-label={`Ver anteriores de ${label}`}><ChevronLeft size={20} /></button>
    <div className="shop-rail-track" ref={track} role="region" aria-label={label} tabIndex={0}>{children}</div>
    <button className="shop-rail-arrow is-next" onClick={() => move(1)} disabled={edges.end} aria-label={`Ver más de ${label}`}><ChevronRight size={20} /></button>
  </div>;
}
