import { SharedRenderCanvas } from "../../../components/render/shared-render-canvas";

export default function SharedProjectPage({
  params,
}: {
  params: { token: string };
}) {
  return <SharedRenderCanvas token={params.token} />;
}
