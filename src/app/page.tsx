import { ChatInterface } from '@/components/chat';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 lg:p-8">
      <ChatInterface />
    </main>
  );
}
