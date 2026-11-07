# 高清场景图放这里

生成提示词见 [`docs/scene-prompts.md`](../../docs/scene-prompts.md)。

需要的文件（16:9，WebP，单张 ≤700KB）：

```
public/scenes/rainy-study.webp    # 雨夜书房
public/scenes/dusk-library.webp   # 黄昏图书馆
public/scenes/dawn-desk.webp      # 清晨书桌
```

- 图片加载成功后会自动淡入并覆盖 SVG 回退场景，不需要改代码。
- 构图请给右侧约 30% 留出安静墙面（耄耋相框会叠在那里）。
- 不要包含人物、猫、文字、字幕、水印、logo。
- 缺图或加载失败时，页面继续使用内置 SVG 场景。
