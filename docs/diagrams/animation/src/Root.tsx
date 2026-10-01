import { Composition } from "remotion";
import { MyComposition } from "./Composition";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="nimo-flow"
        component={MyComposition}
        durationInFrames={220}
        fps={30}
        width={1280}
        height={720}
      />
    </>
  );
};
