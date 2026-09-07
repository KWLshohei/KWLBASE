import CardStudio from "@/components/CardStudio";

export default function Home() {
  // キーを置かずに公開する運用もあるため、AI 背景を出すかどうかはサーバー側の設定で決める
  return <CardStudio aiEnabled={Boolean(process.env.OPENAI_API_KEY)} />;
}
