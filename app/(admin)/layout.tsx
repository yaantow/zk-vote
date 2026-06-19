import { Header } from "@/components/Header";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main className="mx-auto h-[calc(100vh-3.5rem)] max-w-7xl px-4 py-4 flex flex-col">
        {children}
      </main>
    </>
  );
}
