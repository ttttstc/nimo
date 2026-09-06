"""test_wordcount: wordcount 工具验收测试（python test_wordcount.py 直接运行，不依赖 pytest）。"""
import subprocess
import sys
from pathlib import Path

SCRIPT = Path(__file__).with_name("wordcount.py")


def run_wordcount(*args: str) -> str:
    result = subprocess.run(
        [sys.executable, str(SCRIPT), *args],
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0, f"命令异常退出 {result.returncode}: {args}\n{result.stderr}"
    return result.stdout


# 1. 基础计数不变（两条基线命令输出仍为 9 与 4）
def test_baseline_count_unchanged() -> None:
    assert run_wordcount("the quick brown fox jumps over the lazy dog") == "9\n"
    assert run_wordcount("Hello hello HELLO world") == "4\n"


# 2. --top 词频输出：频率降序，且不再输出总词数
def test_top_frequency_output() -> None:
    out = run_wordcount("--top", "3", "the quick brown fox jumps over the lazy dog")
    assert out == "the 2\nbrown 1\ndog 1\n"


# 3. 大小写归一：Hello/hello/HELLO 合并计数
def test_top_case_insensitive() -> None:
    assert run_wordcount("--top", "2", "Hello hello HELLO world") == "hello 3\nworld 1\n"


# 4. 同频率时按单词字母升序
def test_top_tie_breaks_alphabetically() -> None:
    text = "banana apple cherry apple banana cherry"
    assert run_wordcount("--top", "3", text) == "apple 2\nbanana 2\ncherry 2\n"


# 5. N 超过不同单词数时输出全部单词
def test_top_n_exceeds_distinct_words() -> None:
    assert run_wordcount("--top", "10", "one two two") == "two 2\none 1\n"


# 6. 空文本：无 --top 输出 0；有 --top 输出空（独立审查 Finding B 补充）
def test_empty_text() -> None:
    assert run_wordcount("") == "0\n"
    assert run_wordcount("--top", "3", "") == ""


# 7. N < 1 时报参数错误并以退出码 2 结束（独立审查 Finding A 补充）
def test_top_rejects_non_positive_n() -> None:
    result = subprocess.run(
        [sys.executable, str(SCRIPT), "--top", "0", "a b"],
        capture_output=True,
        text=True,
    )
    assert result.returncode == 2
    assert "N 为正整数" in result.stderr


if __name__ == "__main__":
    test_baseline_count_unchanged()
    test_top_frequency_output()
    test_top_case_insensitive()
    test_top_tie_breaks_alphabetically()
    test_top_n_exceeds_distinct_words()
    test_empty_text()
    test_top_rejects_non_positive_n()
    print("全部测试通过")
