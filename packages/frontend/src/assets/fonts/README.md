# 本文フォント（BIZ UDPGothic）

JESGO の本文フォントの実体。`src/biz-udpgothic.css` が `url('/fonts/BIZUDPGothic-Regular.ttf')` で参照し、
`webpack.config.js` の `copy-webpack-plugin` が `dist/fonts/` へ出力する。

## 収録物

| ファイル | 内容 | ビルド成果物への出力 |
|----------|------|----------------------|
| `BIZUDPGothic-Regular.ttf` | BIZ UDPGothic Regular（Version 1.002） | **する**（`dist/fonts/`） |
| `BIZUDPGothic-Bold.ttf` | BIZ UDPGothic Bold（Version 1.002） | **しない**（CSS に太字の面を定義していないため。下記参照） |
| `OFL.txt` | SIL Open Font License 1.1 全文 | **する**（`dist/fonts/`） |

## ライセンス

SIL Open Font License, Version 1.1。全文は `OFL.txt`。

- 著作権表示: `Copyright 2022 The BIZ UDGothic Project Authors`
- 入手元: <https://github.com/googlefonts/morisawa-biz-ud-gothic>（OFL 版）
- 再配布にあたり、OFL 1.1 の条件に従いライセンス全文を配布物へ同梱している（`dist/fonts/OFL.txt`）。
  フォントファイル名から `BIZ UDPGothic` という予約名を変更していないため、改変は行っていない。

### `OFL.txt` 冒頭の URL が `…-mincho` になっている理由（v1.6.0 / Sprint G で追記）

`OFL.txt` の 1 行目は次のようになっている。

```
Copyright 2022 The BIZ UDGothic Project Authors (https://github.com/googlefonts/morisawa-biz-ud-mincho)
```

一方、同梱している TTF の `name` テーブルが名乗るプロジェクト URL は `…/morisawa-biz-ud-gothic` である。
**この食い違いは上流（Google Fonts の `morisawa-biz-ud-gothic` リポジトリ）の `OFL.txt` 自体にある表記揺れであり、
当リポジトリで書き換えたものではない。** 入手元の原文と **バイト単位で一致**していることを確認している
（4,408 バイト / SHA-256 先頭 `e753d7155d53c747`。`https://raw.githubusercontent.com/googlefonts/morisawa-biz-ud-gothic/main/OFL.txt` と比較）。

**OFL 1.1 は著作権表示とライセンス文をそのまま複製することを求めており、こちらで URL を「正しい方」に直すことは
著作権表示の改変に当たる。** したがって **原文のまま同梱する**。
ライセンス上の要件である著作権者の表示（`The BIZ UDGothic Project Authors`）は、同梱フォント（BIZ UDGothic プロジェクト）と
一致しているため、要件は満たしている。

**注意**: Windows に標準搭載されている BIZ UDPGothic（Version 2.02）はモリサワ／Microsoft 提供の別配布物であり、
再配布は許諾されていない。同梱しているのは上記 OFL 版のみである。

## Bold を出力しない理由

`biz-udpgothic.css` の `@font-face` は `font-weight: normal` の面を 1 つだけ定義している。
v1.5 の定義（`local('BIZ UDPGothic')` のみ）も同様に normal の面 1 つであり、
`font-weight: 700` の文字はブラウザの合成太字で描画されていた。
Bold の面を追加すると太字の見た目が v1.5 から変わるため、意図的に追加していない。
