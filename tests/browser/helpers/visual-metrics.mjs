// Browser-evaluated contrast measurements. CSS colors are parsed by the browser,
// including color-mix(), color(srgb ...), transparency and inherited surfaces.
export function measureContrast(element) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  const rgba = value => {
    context.clearRect(0, 0, 1, 1); context.fillStyle = value; context.fillRect(0, 0, 1, 1);
    const pixel = [...context.getImageData(0, 0, 1, 1).data];
    return [pixel[0], pixel[1], pixel[2], pixel[3] / 255];
  };
  const background = node => {
    if (!node) return [255, 255, 255];
    const color = rgba(getComputedStyle(node).backgroundColor), behind = background(node.parentElement);
    return color.slice(0, 3).map((value, index) => value * color[3] + behind[index] * (1 - color[3]));
  };
  const luminance = color => {
    const linear = color.slice(0, 3).map(value => value / 255)
      .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
  };
  const contrast = (foreground, adjacent) => {
    const a = luminance(foreground), b = luminance(adjacent);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  };
  const style = getComputedStyle(element);
  return {
    text: contrast(rgba(style.color), background(element)),
    stroke: contrast(rgba(style.stroke), background(element.parentElement)),
    outline: contrast(rgba(style.outlineColor), background(parseFloat(style.outlineOffset) < 0 ? element : element.parentElement))
  };
}
