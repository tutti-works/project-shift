"use client";

import { useEffect, useState } from "react";
import styles from "./ScrollIndicator.module.css";

export const ScrollIndicator = () => {
  const [visible, setVisible] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Hybrid mobile detection: touch capability + screen size OR mobile/tablet UA
    const checkMobile = () => {
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth < 768;
      const isMobileUA = /iPhone|iPod|Android.*Mobile/i.test(navigator.userAgent);
      const isTablet = /iPad|Android(?!.*Mobile)/i.test(navigator.userAgent);

      // Mobile if: (touch + small screen) OR mobile UA OR tablet
      const shouldShowSwipeUI = (hasTouch && isSmallScreen) || isMobileUA || isTablet;
      setIsMobile(shouldShowSwipeUI);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

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
      {!isMobile && (
        <div className={styles.mouse}>
          <div className={styles.wheel}></div>
        </div>
      )}
      <div className={isMobile ? styles.arrowsMobile : styles.arrows}>
        <span className={styles.arrow}></span>
        <span className={styles.arrow}></span>
        <span className={styles.arrow}></span>
      </div>
    </div>
  );
};
