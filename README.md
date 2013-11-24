frontier-web
============

https://bitbucket.org/bryankadzban/frontier rewritten for html5/webgl

Yes, this does weird things with the matrices, splitting model (the matrix to
translate from model coordinates into world coordinates) and view (the one to
translate from world to camera).  The reason is that the model matrix is the
same for a single vertex for every scene (except for animations, but those are
not at all common in this project), and different for different vertices.  So
tying it to the vertices (making it a shader attribute instead of a uniform)
allows me to do *far* fewer draw requests, and send *far* more points to the
video card in each request.  It also allows me to do all the matrix math once,
when setting up the buffers, rather than on every scene, which I would have to
do if I pushed camera-space coordinates down every frame in a single draw call
(because the view matrix changes every frame).

The downside is that if the model->world transformation ends up moving the model
too far, loss of precision in the floating point numbers might destroy the
rendering.  Not an issue so far, and hopefully the world stays small enough that
it remains a nonissue, but it is something I will need to keep an eye on.

So it sends down a vector for the vertex, a vector for the normal (which is not
yet used, since the shaders are avoiding lighting for now), a vector for the
texture coordinates, and a set of four four-vectors for the model->world matrix.
It also sends a uniform projection and view matrix.  The shader does do an extra
matrix multiply compared to the standard OpenGL setup, but I believe the gains
from only calling a draw function once per scene, and not having to do matrix
math on many thousands of points in javascript (even if it is pretty fast, with
gl-matrix, it gets nowhere near the speed of the video card), outweigh the loss
from having to do an extra matrix multiply.

(...on github only so I can edit it while on vacation)
