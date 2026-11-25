import Link from "~/components/Link";

export default function NotFound() {
  return (
    <main className="info" style={{ marginTop: 130 }}>
      <h1>404 - Not Found</h1>
      <p>
        <Link to={["{filter}"]}>Back to todos</Link>
      </p>
    </main>
  );
}
