import { DetectedObject } from "@tensorflow-models/coco-ssd";

export function drawOnCanvas(
  mirrored: boolean,
  prediction: DetectedObject[],
  ctx: CanvasRenderingContext2D | null | undefined
) {
  prediction.forEach((detectedObject: DetectedObject) => {
    const { class: name, bbox, score } = detectedObject;
    const [x, y, width, height] = bbox;

    if (ctx) {
      ctx.beginPath();

      //Styling
      ctx.fillStyle = name === "person" ? "#FF0F0F" : "";
      ctx.globalAlpha = 0.4;

      mirrored
        ? ctx.roundRect(ctx.canvas.width - x, y, -width, height, 8)
        : ctx.roundRect(x, y, width, height, 8);

      // Draw
      ctx.fill();

      // Text Styling
      ctx.font = "12px Courier New";
      ctx.globalAlpha = 1;
      ctx.fillStyle = "black";
      mirrored
        ? ctx.fillText(name, ctx.canvas.width - x - width + 10, y + 20)
        : ctx.fillText(name, x + 10, y + 20);
    }
  });
}
