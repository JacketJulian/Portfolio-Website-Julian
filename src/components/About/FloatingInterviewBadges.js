import React, { memo } from 'react';
import './FloatingInterviewBadges.css';

const BADGES = Object.freeze([
  { id: 1, left: '7%', top: '10%', duration: '13s', delay: '0s', drift: '5rem', rotation: '-7deg', endRotation: '4deg', scale: '0.86' },
  { id: 2, left: '23%', top: '20%', duration: '16s', delay: '1.2s', drift: '-4rem', rotation: '5deg', endRotation: '-5deg', scale: '0.72' },
  { id: 3, left: '42%', top: '8%', duration: '15s', delay: '0.4s', drift: '3rem', rotation: '-3deg', endRotation: '7deg', scale: '0.8' },
  { id: 4, left: '63%', top: '16%', duration: '18s', delay: '2s', drift: '-5rem', rotation: '8deg', endRotation: '-4deg', scale: '0.76' },
  { id: 5, left: '84%', top: '7%', duration: '14s', delay: '0.8s', drift: '4rem', rotation: '-5deg', endRotation: '5deg', scale: '0.9' },
  { id: 6, left: '14%', top: '39%', duration: '17s', delay: '2.8s', drift: '-3rem', rotation: '4deg', endRotation: '-8deg', scale: '0.78' },
  { id: 7, left: '34%', top: '48%', duration: '13.5s', delay: '1.6s', drift: '5rem', rotation: '-9deg', endRotation: '2deg', scale: '0.68' },
  { id: 8, left: '54%', top: '34%', duration: '16.5s', delay: '0.2s', drift: '-4rem', rotation: '3deg', endRotation: '-6deg', scale: '0.84' },
  { id: 9, left: '76%', top: '43%', duration: '15.5s', delay: '2.3s', drift: '3rem', rotation: '-4deg', endRotation: '8deg', scale: '0.7' },
  { id: 10, left: '94%', top: '32%', duration: '19s', delay: '1s', drift: '-6rem', rotation: '7deg', endRotation: '-3deg', scale: '0.82' },
  { id: 11, left: '5%', top: '66%', duration: '14.5s', delay: '1.9s', drift: '4rem', rotation: '-6deg', endRotation: '6deg', scale: '0.74' },
  { id: 12, left: '25%', top: '76%', duration: '18.5s', delay: '0.6s', drift: '-5rem', rotation: '5deg', endRotation: '-7deg', scale: '0.88' },
  { id: 13, left: '45%', top: '64%', duration: '16s', delay: '2.6s', drift: '6rem', rotation: '-8deg', endRotation: '3deg', scale: '0.7' },
  { id: 14, left: '65%', top: '82%', duration: '13s', delay: '1.4s', drift: '-3rem', rotation: '4deg', endRotation: '-5deg', scale: '0.8' },
  { id: 15, left: '86%', top: '68%', duration: '17.5s', delay: '0.9s', drift: '5rem', rotation: '-5deg', endRotation: '7deg', scale: '0.76' },
  { id: 16, left: '16%', top: '91%', duration: '15s', delay: '2.1s', drift: '-4rem', rotation: '6deg', endRotation: '-4deg', scale: '0.82' },
  { id: 17, left: '57%', top: '95%', duration: '19s', delay: '1.1s', drift: '4rem', rotation: '-3deg', endRotation: '6deg', scale: '0.72' },
  { id: 18, left: '92%', top: '90%', duration: '14s', delay: '2.5s', drift: '-5rem', rotation: '8deg', endRotation: '-6deg', scale: '0.86' },
]);

const FloatingInterviewBadges = memo(() => (
  <div className="floating-interview-field" aria-hidden="true">
    {BADGES.map((badge) => (
      <span
        className="floating-interview-badge"
        key={badge.id}
        style={{
          '--badge-left': badge.left,
          '--badge-top': badge.top,
          '--badge-duration': badge.duration,
          '--badge-delay': badge.delay,
          '--badge-drift': badge.drift,
          '--badge-rotation': badge.rotation,
          '--badge-end-rotation': badge.endRotation,
          '--badge-scale': badge.scale,
        }}
      >
        <span className="floating-interview-dot">●</span>
        Open for Interviews
      </span>
    ))}
  </div>
));

FloatingInterviewBadges.displayName = 'FloatingInterviewBadges';

export default FloatingInterviewBadges;
