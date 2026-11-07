# 高清场景图

仓库已包含三张 Seedream 生成的 16:9 场景（2560×1440 WebP，已裁掉右下角水印）：

```
public/scenes/rainy-study.webp    # 雨夜书房
public/scenes/dusk-library.webp   # 黄昏图书馆
public/scenes/dawn-desk.webp      # 清晨书桌
```

- 替换时保持文件名不变即可；图片加载成功后会自动淡入并覆盖 SVG 回退场景。
- 构图请给右侧约 30% 留出安静墙面（耄耋相框会叠在那里）。
- 不要包含人物、猫、文字、字幕、水印、logo。
- 缺图或加载失败时，页面继续使用内置 SVG 场景。
- 重新生成的提示词见 [`docs/scene-prompts.md`](../../docs/scene-prompts.md)。
