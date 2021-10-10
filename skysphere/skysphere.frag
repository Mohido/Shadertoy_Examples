#iChannel0 "file://HDRI_Hero.png"
#define PI 3.14159265359
#define ZNEAR 1. // Distance from camera to canvas
#define ZFAR 10. // Distance of camera to view horizon 



/*
Inputs:
  theta in radians
output: 
  Returns a 2x2 matrix which is used to rotate over a 2D space. 2D rotation is same as a 3D z-axis rotation.

  | cos(@)   -sin(@) |        | x |
  | sin(@)    cos(@) |   *    | y |
*/
mat2 rotate2d(float theta) {
  float s = sin(theta), c = cos(theta);
  return mat2(c, -s, s, c);
}




/*
    Line-Plane intersection geometrically.
    parameters: 
      orig:         ray origin
      rayDir:       ray direction
      sphereCent:   sphere position with respect to world
      radius:       sphere radius
*/
float distancePlane(vec3 rayOrig, vec3 rayDir, vec3 planePos, vec3 planeNorm){
    return max(dot(planePos - rayOrig, planeNorm)/dot(rayDir, planeNorm),0.);   
}




/*
    Line sphere intersection geometrically.
    parameters: 
      orig:         ray origin
      rayDir:       ray direction
      sphereCent:   sphere position with respect to world
      radius:       sphere radius
*/
float distanceSphere(vec3 orig,  vec3 rayDir, vec3 sphereCent, float radius){
    rayDir = normalize(rayDir);
    float scaler = dot(sphereCent - orig, rayDir);    // scaler to center/rayline projection
    float cc_len = length((orig + rayDir * scaler) - (sphereCent)); // Length until middle of circle's chord (Where the projection lands)
    if(cc_len > radius) return -1.; // Not passing by the circle
    float bias = sqrt(radius*radius - cc_len*cc_len); // pythogerian to find half circle's chord
    vec2 biasLengths = vec2(scaler - bias, scaler + bias); // points of line-circle intersection
    if(min(biasLengths.x, biasLengths.y) < 0.) return max(biasLengths.x, biasLengths.y); //minimum is behind the camera, so we return the other point
    return min(biasLengths.x, biasLengths.y); // if minimum is positive, then that is the desired point
}


/*
P is the intersection point in respect to world space not camera space,
Source: http://raytracerchallenge.com/bonus/texture-mapping.html
Maps a point from a 3D space to a 2D texture coordinate system x withen [0,1], y withen [0,1].
Input:
  A 3D vector in camera space cartesian coordinate system, since the Camera position
     is where the world center is defined at.
Output:
  Returns a 2D vector which describes the texture normalized coordinate system. with respect that the texture 
      [0,0] start from bottom left. And [1,1] ends at top-right.
*/
vec2 spherical_map(vec3 p){
    float theta = atan(p.x, p.z); // Horizental angle clockwise.  -Pi  <= theta <=  Pi. 
    float radius = length(p);     // Sphere radius
    float phi = acos(p.y / radius); // Vertical angle.  -1 <= p.y / radius <= 1 ....    0 <= phi <= π
    float raw_u = theta / (2. * PI); // -0.5 <= raw_u <= 0.5
    float u = 1. - (raw_u + 0.5);   // 0. <= u <= 1.  x-axis normalized form of the 2D texture. (counter-clockwise)
    float v = 1. - phi / PI;        // 0 <= Phi/Pi <= 1 ............  0 <= v <= 1.
    return vec2(u, v);
}





void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    vec2 uv_n = fragCoord/iResolution.xy; // normalizing the screen coords (0,1)
    vec2 uv = uv_n - .5;
    uv.x *= iResolution.x/iResolution.y; // x*aspectratio


    // Mouse Normalized coordinate which will be used later for rotation
    vec2 mouseUV = iMouse.xy/iResolution.xy;
    if (mouseUV == vec2(0.0)) 
      mouseUV = vec2(0.5); // trick to center mouse on page load


    // Initializing the Camera
    vec3 cameraPos = vec3(0., 0., 0.);
    
    /* Shooting ray toward the canvas(Image plane) */
    vec3 rayOrig = cameraPos;
    vec3 rayDir = normalize(vec3(uv.x, uv.y, ZNEAR));

    /* Handling Mouse rotation. Polar coordinate system*/
    float mouseV = mix(-PI/2., PI/2., mouseUV.y);   // Mouse vertical theta
    rayDir.yz *= rotate2d(mouseV);                  // x-axis rotation
    float mouseH = mix(-PI, PI, mouseUV.x);         // mouse horizontal theta
    rayDir.xz *= rotate2d(mouseH);                  // y-axis rotation

    /* Drawing the world */
    float scaler = distanceSphere(rayOrig, rayDir, cameraPos, ZFAR); // ZFAR is the radius for now.
    if (scaler < 0.){ // Does not intersect the sphere at all
      fragColor = vec4(vec3(0.), 1.0);
      return;
    }
    // Sphere intersection was successful
    vec3 intP = (rayOrig + rayDir*scaler); // intersection point (ray -> sphere surface)
    vec2 texture_coord = spherical_map(intP - cameraPos); // texture coordinates

    /* Output colour*/
    vec3 col = texture(iChannel0, texture_coord).rgb;
    fragColor = vec4(col, 1.0);
   
}