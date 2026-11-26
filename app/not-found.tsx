import Link from "next/link";

export default function NotFound() {
  return (
    <main className="not-found">
      <span>404</span>
      <h1>Scene Not Found.</h1>
      <p>The frame you&apos;re looking for exists outside this cut.</p>
      <Link href="/">Return to Studio</Link>
    </main>
  );
}
