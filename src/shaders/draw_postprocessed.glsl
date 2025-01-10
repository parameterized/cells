vec3 color = cells(UV).rgb;
vec3 colorMinusWhite = (color - vec3(1));
vec3 colorMWNorm = normalize(colorMinusWhite);
float colorMWLen = length(colorMinusWhite);
float newLen = 1.2 + 0.7 * tanh(colorMWLen - 1.0);
FOut = vec4(vec3(1) + colorMWNorm * newLen, 1);
