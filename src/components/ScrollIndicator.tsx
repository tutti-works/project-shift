"use client";

import { useEffect, useState } from "react";
import styles from "./ScrollIndicator.module.css";

export const ScrollIndicator = () => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      // Fade out after scrolling starts
      if (window.scrollY > 50) {
        setVisible(false);
      } else {
        setVisible(true);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div
      className={styles.container}
      style={{ opacity: visible ? 1 : 0 }}
    >
      <div className={styles.mouse}>
        <div className={styles.wheel}></div>
      </div>
      <div className={styles.arrows}>
        <span className={styles.arrow}></span>
        <span className={styles.arrow}></span>
        <span className={styles.arrow}></span>
      </div>
    </div>
  );
};
