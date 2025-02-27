import styles from "./globalSpinner.module.css";

export const GlobalSpinner = () => {
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center overflow-hidden bg-white">
      <div className={styles["dot-floating"]} aria-label="loading" />
    </div>
  );
};
