"""wordcount: 统计文本中的单词数。"""
import argparse
import re
from collections import Counter

__version__ = "0.2.0"


def count_words(text: str) -> int:
    return len(re.findall(r"[A-Za-z0-9']+", text))


def top_words(text: str, n: int) -> list[tuple[str, int]]:
    words = [w.lower() for w in re.findall(r"[A-Za-z0-9']+", text)]
    return sorted(Counter(words).items(), key=lambda item: (-item[1], item[0]))[:n]


def main() -> None:
    parser = argparse.ArgumentParser(description="统计文本中的单词数")
    parser.add_argument("text", help="要统计的文本")
    parser.add_argument("--top", type=int, metavar="N", help="输出出现频率最高的 N 个单词")
    args = parser.parse_args()
    if args.top is not None:
        if args.top < 1:
            parser.error("--top N 要求 N 为正整数")
        for word, count in top_words(args.text, args.top):
            print(f"{word} {count}")
    else:
        print(count_words(args.text))


if __name__ == "__main__":
    main()
