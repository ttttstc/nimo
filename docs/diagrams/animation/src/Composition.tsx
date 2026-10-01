import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const DARK = "#0f172a";
const CYAN = "#22d3ee";
const GREEN = "#34d399";
const AMBER = "#fbbf24";
const ROSE = "#fb7185";
const MUTED = "#94a3b8";

const STAGES = [
  { key: "intent", title: "入口判断意图", sub: "自然语言识别 · 明确说法优先", color: CYAN },
  { key: "playbook", title: "匹配 playbook", sub: "复制步骤 · 按任务调整", color: GREEN },
  { key: "delegate", title: "委派子 agent", sub: "完整任务约定 · 主 agent 验收", color: CYAN },
  { key: "verify", title: "真实验证", sub: "真实用户路径 · 不放宽预期", color: AMBER },
  { key: "deliver", title: "交付结论", sub: "通过 / 失败 / 未验证 · 附证据", color: ROSE },
];

const VERDICTS = [
  { label: "通过 PASS", color: GREEN },
  { label: "失败 FAIL", color: ROSE },
  { label: "未验证 UNVERIFIED", color: MUTED },
];

export const MyComposition: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const stageLen = 26;
  const titleFrames = 20;
  const verdictFrames = 66;

  const titleProgress = spring({ frame, fps, config: { damping: 200 } });
  const titleY = interpolate(titleProgress, [0, 1], [-40, 0]);
  const titleOpacity = interpolate(frame, [0, 10], [0, 1], {
    extrapolateRight: "clamp",
  });
  const titleExit = interpolate(frame, [titleFrames, titleFrames + 8], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const stageStart = titleFrames + 6;
  const stagesEnd = stageStart + STAGES.length * stageLen;
  const verdictStart = stagesEnd + 4;

  return (
    <AbsoluteFill style={{ background: DARK }}>
      {/* title card */}
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
            fontSize: 110,
            fontWeight: 800,
            color: "#fff",
            transform: `translateY(${titleY}px)`,
            letterSpacing: -2,
          }}
        >
          nimo
        </div>
        <div
          style={{
            fontSize: 34,
            color: CYAN,
            marginTop: 18,
            fontWeight: 600,
          }}
        >
          可审计的 agent 工程交付
        </div>
        <div style={{ fontSize: 22, color: MUTED, marginTop: 14 }}>
          原则 · Playbook · 真实验证 · 证据
        </div>
      </div>

      {/* stages */}
      {STAGES.map((stage, i) => {
        const start = stageStart + i * stageLen;
        const local = frame - start;
        const visible = local >= 0 && frame < stagesEnd + 6;
        if (!visible) return null;
        const enter = spring({ frame: local, fps, config: { damping: 200 } });
        const active = frame < start + stageLen;
        const y = 110 + i * 88;
        const opacity = active
          ? interpolate(local, [0, 6], [0, 1], { extrapolateRight: "clamp" })
          : 1;
        const barW = interpolate(enter, [0, 1], [0, 560]);
        return (
          <div
            key={stage.key}
            style={{
              position: "absolute",
              left: 260,
              top: y,
              display: "flex",
              alignItems: "center",
              gap: 26,
              opacity,
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 16,
                background: "#1e293b",
                border: `2.5px solid ${stage.color}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 30,
                fontWeight: 800,
                color: stage.color,
              }}
            >
              {String(i + 1).padStart(2, "0")}
            </div>
            <div>
              <div style={{ fontSize: 40, fontWeight: 700, color: "#fff" }}>
                {stage.title}
              </div>
              <div style={{ fontSize: 22, color: MUTED, marginTop: 4 }}>
                {stage.sub}
              </div>
            </div>
            <div
              style={{
                height: 6,
                width: barW,
                background: stage.color,
                borderRadius: 3,
                marginLeft: 8,
              }}
            />
          </div>
        );
      })}

      {/* connector line growing through stages */}
      <div
        style={{
          position: "absolute",
          left: 291,
          top: 110 + 32,
          width: 3,
          height: interpolate(
            frame,
            [stageStart, stagesEnd],
            [0, (STAGES.length - 1) * 88],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          ),
          background: `linear-gradient(${CYAN}, ${GREEN}, ${ROSE})`,
          opacity: frame > stageStart && frame < stagesEnd + 6 ? 1 : 0,
        }}
      />

      {/* verdicts */}
      {frame >= verdictStart &&
        VERDICTS.map((v, i) => {
          const local = frame - verdictStart - i * 8;
          if (local < 0) return null;
          const enter = spring({ frame: local, fps, config: { damping: 200 } });
          const scale = interpolate(enter, [0, 1], [0.6, 1]);
          return (
            <div
              key={v.label}
              style={{
                position: "absolute",
                left: 260 + i * 420,
                top: 560,
                padding: "22px 40px",
                borderRadius: 18,
                border: `3px solid ${v.color}`,
                background: "#1e293b",
                color: v.color,
                fontSize: 38,
                fontWeight: 800,
                transform: `scale(${scale})`,
              }}
            >
              {v.label}
            </div>
          );
        })}

      {/* closing tagline */}
      {frame >= durationInFrames - 30 && (
        <div
          style={{
            position: "absolute",
            bottom: 60,
            width: "100%",
            textAlign: "center",
            fontSize: 26,
            color: MUTED,
            opacity: interpolate(
              frame,
              [durationInFrames - 30, durationInFrames - 20],
              [0, 1]
            ),
          }}
        >
          github.com/ttttstc/nimo
        </div>
      )}
    </AbsoluteFill>
  );
};
