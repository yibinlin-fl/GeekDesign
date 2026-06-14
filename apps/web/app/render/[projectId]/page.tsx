import { ServerRenderCanvas } from "../../../components/render/server-render-canvas";

export const metadata = {
  robots: { index: false, follow: false },
};

export default function RenderProjectPage({
  params,
}: {
  params: { projectId: string };
}) {
  return <ServerRenderCanvas projectId={params.projectId} />;
}
