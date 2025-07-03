import { Layout } from "@/components/Layout";
import { LegacyApiTest } from "@/components/LegacyApiTest";

export default function LegacyApiTestPage() {
  return (
    <Layout className="container mx-auto py-1 px-3 sm:px-4">
      <div className="my-6">
        <LegacyApiTest />
      </div>
    </Layout>
  );
}