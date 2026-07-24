import React from 'react';
import { motion } from 'framer-motion';

const AboutTextContent = ({ name, description, animationsEnabled = true }) => {
  const MotionSpan = animationsEnabled ? motion.span : 'span';
  return (
    <div className="about-text-content">
      <p className="about-eyebrow">
        <MotionSpan
          className="about-wave"
          {...(animationsEnabled
            ? {
                initial: { scale: 1 },
                animate: {
                  scale: [1, 8, 1.2, 1],
                  rotate: [0, 20, -10, 20, -5, 0],
                },
                transition: {
                  scale: { times: [0, 0.2, 0.5, 1], duration: 2, ease: "easeInOut" },
                  rotate: { duration: 1.5, repeat: Infinity, repeatDelay: 0.5, ease: "easeInOut" }
                },
              }
            : {})}
          role="img"
          aria-label="waving hand"
        >
          👋
        </MotionSpan>
        Hi, I'm
      </p>
      <h1 className="intro-name">{name}</h1>
      <p className="about-description">{description}</p>
    </div>
  );
};

export default AboutTextContent;
