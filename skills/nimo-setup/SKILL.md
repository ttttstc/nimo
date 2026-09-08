---
name: nimo-setup
description: "安装、更新、卸载 nimo 或检查宿主、脚本、Skill 发现和配置可用性时使用。检测只读，变更遵守当前授权。"
---

# 安装与检测

1. 读取 [宿主合同](../nimo-mode/references/host-contract.md)，核对实际终端、独立上下文、模型选择、真实操作和后台能力，不从目录推断。
2. 脚本需要 Node.js 22+；源码安装另需 npm，GitHub 功能另需已认证 gh。缺失报告，不自动下载运行时或陌生 Skill。
3. 安装／更新需要用户指定的来源仓库，使用 integrations 对应宿主脚本，目标为宿主 skills 目录。卸载可直接用已安装 nimo-mode/scripts/install.mjs 的 uninstall --target <实际 skills 根目录>，不依赖源码仓库仍存在。找不到更新来源时请用户提供，不凭猜测下载。
4. 配置检测使用 [configure-nimo](../configure-nimo/SKILL.md) 的 inspect/validate，无文件不创建空 YAML。
5. 报告已发现、已调用与未验证功能，分清三者；提示词不等于后台能力。

安装不改宿主模型、权限、凭据或个人引用。更新冲突保留文件，不强行覆盖。
