import AppLayout from "@/components/layout/AppLayout";

const tips = [
  {
    id: 1,
    title: "How to describe a client requirement",
    body: "Be specific about location, budget, number of bedrooms, and purpose (buy or rent). The more detail you provide, the better the AI can match properties. Mention landmarks or areas the client prefers.",
    icon: "📝",
  },
  {
    id: 2,
    title: "How to use voice input",
    body: "Speak clearly and naturally. Mention the client's name, what they are looking for, their budget, and any special requirements. You can speak in English or Hindi. Keep it under 2 minutes for best results.",
    icon: "🎤",
  },
  {
    id: 3,
    title: "How to review AI-generated requirements",
    body: "After the AI interprets your input, review the structured summary carefully. Check that location, budget, and property type are correct. Edit any fields before confirming to ensure the search returns the right properties.",
    icon: "✅",
  },
  {
    id: 4,
    title: "How to describe rejected properties",
    body: "If a client has already seen and rejected certain types of properties, mention this in your requirement. For example: 'Client does not want ground floor flats' or 'No properties near the highway'.",
    icon: "🚫",
  },
  {
    id: 5,
    title: "How to share PropShorts with clients",
    body: "After your PropShort is generated, use the Share button to copy a shareable link. You can send this link directly to your client via WhatsApp, email, or SMS. The client can view the videos and PDF from any device.",
    icon: "🔗",
  },
  {
    id: 6,
    title: "Getting better property matches",
    body: "Include as many requirement details as possible: sqft range, floor preference, amenities (gym, pool, parking), property age, and distance from key locations like office or school.",
    icon: "🎯",
  },
];

export default function TipsPage() {
  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tips for Brokers</h1>
          <p className="mt-1 text-sm text-gray-500">
            Get the most out of PropShorts with these best practices.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {tips.map((tip) => (
            <div
              key={tip.id}
              className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200"
            >
              <div className="mb-3 text-3xl">{tip.icon}</div>
              <h3 className="font-semibold text-gray-900">{tip.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">{tip.body}</p>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
