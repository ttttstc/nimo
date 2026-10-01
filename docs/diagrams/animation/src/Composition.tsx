import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const CREAM = "#F0EEE6";
const INK = "#191919";
const CRAIL = "#D97757";
const WARM = "#6E6B64";
const HAIRLINE = "#D8D5CC";

const SERIF = "Georgia, 'Times New Roman', 'SimSun', serif";

const STAGES = [
  { title: "入口判断意图", sub: "自然语言识别 · 明确说法优先" },
  { title: "匹配 playbook", sub: "复制步骤 · 按任务调整顺序" },
  { title: "委派子 agent", sub: "完整任务约定 · 主 agent 验收" },
  { title: "真实验证", sub: "真实用户路径 · 不放宽预期" },
  { title: "交付结论", sub: "通过 / 失败 / 未验证 · 附证据" },
];

export const MyComposition: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const titleFrames = 30;
  const stageStart = titleFrames + 8;
  const stageLen = 30;
  const stagesEnd = stageStart + STAGES.length * stageLen;

  // Title card
  const titleIn = spring({ frame, fps, config: { damping: 200 } });
  const titleY = interpolate(titleIn, [0, 1], [-32, 0]);
  const titleOpacity = interpolate(frame, [0, 8], [0, 1], {
    extrapolateRight: "clamp",
  });
  const titleExit = interpolate(
    frame,
    [titleFrames, titleFrames + 8],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const ruleW = interpolate(frame, [6, titleFrames], [0, 88], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: CREAM, fontFamily: SERIF }}>
      {/* Title card */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          opacity: titleOpacity * titleExit,
        }}
      >
        <div
          style={{
            fontSize: 128,
            fontWeight: 600,
            color: INK,
            letterSpacing: -1,
            transform: `translateY(${titleY}px)`,
          }}
        >
          nimo
        </div>
        <div
          style={{
            width: ruleW,
            height: 3,
            background: CRAIL,
            marginTop: 22,
            marginBottom: 26,
          }}
        />
        <div style={{ fontSize: 32, color: WARM, letterSpacing: 6 }}>
          可审计的 agent 工程交付
        </div>
      </div>

      {/* Stage rail */}
      <div
        style={{
          position: "absolute",
          left: 264,
          top: 176,
          width: 2,
          height: interpolate(
            frame,
            [stageStart, stagesEnd],
            [0, (STAGES.length - 1) * 96],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          ),
          background: CRAIL,
          opacity: frame > stageStart ? 1 : 0,
        }}
      />

      {/* Stages */}
      {STAGES.map((stage, i) => {
        const start = stageStart + i * stageLen;
        const local = frame - start;
        if (local < 0) return null;
        const enter = spring({ frame: local, fps, config: { damping: 200 } });
        const x = interpolate(enter, [0, 1], [26, 0]);
        const opacity = interpolate(local, [0, 6], [0, 1], {
          extrapolateRight: "clamp",
        });
        const y = 144 + i * 96;
        return (
          <div
            key={stage.title}
            style={{
              position: "absolute",
              left: 300,
              top: y,
              display: "flex",
              alignItems: "baseline",
              gap: 28,
              opacity,
              transform: `translateX(${x}px)`,
            }}
          >
            <div
              style={{
                fontSize: 44,
                color: CRAIL,
                fontWeight: 600,
                fontVariantNumeric: "lining-nums",
                minWidth: 64,
              }}
            >
              {String(i + 1).padStart(2, "0")}
            </div>
            <div>
              <div
                style={{
                  fontSize: 40,
                  color: INK,
                  fontWeight: 600,
                  lineHeight: 1.2,
                }}
              >
                {stage.title}
              </div>
              <div
                style={{
                  fontSize: 21,
                  color: WARM,
                  marginTop: 8,
                  letterSpacing: 1,
                }}
              >
                {stage.sub}
              </div>
            </div>
          </div>
        );
      })}

      {/* Closing */}
      {frame >= durationInFrames - 36 && (
        <div
          style={{
            position: "absolute",
            bottom: 64,
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 14,
            opacity: interpolate(
              frame,
              [durationInFrames - 36, durationInFrames - 22],
              [0, 1]
            ),
          }}
        >
          <div
            style={{
              width: 88,
              height: 3,
              background: CRAIL,
            }}
          />
          <div
            style={{
              fontSize: 24,
              color: WARM,
              letterSpacing: 4,
            }}
          >
            github.com/ttttstc/nimo
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};
