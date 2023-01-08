import { useEffect, useState } from "react";

const Timer = () => {
  const [time, setTime] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTime((time) => time + 1), 1000);
    return () => clearInterval(interval);
  }, []);
  return <p>Time: {time}</p>;
};

export default function App() {
  const [count, setCount] = useState(0);
  return (
    <div>
      <Timer />
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
      <p>Now edit this text in Astro and in Vite to compare HMR</p>
    </div>
  );
}
