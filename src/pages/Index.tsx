import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LoginArea } from "@/components/auth/LoginArea";
import { Users } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto p-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">NostrGroups</h1>
          <LoginArea />
        </div>
      </header>
      
      {/* Hero Section */}
      <div className="flex-1 flex items-center justify-center bg-gradient-to-b from-blue-50 to-white">
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-5xl font-extrabold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
            Connect with Communities on Nostr
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-10">
            Join, create, and participate in decentralized communities powered by the Nostr protocol.
            Share ideas, connect with like-minded people, and build your network.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="text-lg px-8">
              <Link to="/groups">
                <Users className="mr-2 h-5 w-5" />
                Explore Communities
              </Link>
            </Button>
          </div>
        </div>
      </div>
      
      {/* Features Section */}
      <div className="bg-white py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Why NostrGroups?</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 border rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold mb-3">Decentralized</h3>
              <p className="text-gray-600">
                Built on the Nostr protocol, your data isn't controlled by any single entity.
                You own your content and connections.
              </p>
            </div>
            
            <div className="p-6 border rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold mb-3">Censorship Resistant</h3>
              <p className="text-gray-600">
                Communities can't be arbitrarily shut down or censored.
                Your voice remains heard.
              </p>
            </div>
            
            <div className="p-6 border rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold mb-3">User-Controlled</h3>
              <p className="text-gray-600">
                Create and moderate your own communities with flexible tools.
                Set your own rules and culture.
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="bg-gray-100 py-8">
        <div className="container mx-auto px-4 text-center text-gray-600">
          <p>Built with Nostr NIP-72 • Decentralized Communities</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
