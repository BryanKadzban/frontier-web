// Mersenne Twister; see Random.cpp in Frontier

(function(target) {
	const LOWER_MASK       = 0x7fffffff,
	      M                = 397,
	      MATRIX_A         = 0x9908b0df,
	      N                = 624,
	      TEMPERING_MASK_B = 0x9d2c5680,
	      TEMPERING_MASK_C = 0xefc60000,
	      UPPER_MASK       = 0x80000000;
	// Hmm, these are only used in one place...  so, killing the function calls
	//var SHIFT_L = function(y) { return y >>> 18; },
	//    SHIFT_S = function(y) { return y << 7;  },
	//    SHIFT_T = function(y) { return y << 15; },
	//    SHIFT_U = function(y) { return y >>> 11; };

	target.Mersenne = function(seed) {
		this.mag01 = new Uint32Array([0, MATRIX_A]);
		this.ptgfsr = new Uint32Array(N);
		this.ptgfsr[0] = seed;
		for (this.k = 1; this.k < N; this.k++) {
			this.ptgfsr[this.k] = 69069 * this.ptgfsr[this.k - 1];
		}
		this.k = 1;
	};

	target.Mersenne.prototype._random = function() {
		var kk, y;

		if (this.k == N) {
			for (kk = 0; kk < N-M; kk++) {
				y = (this.ptgfsr[kk] & UPPER_MASK) | (this.ptgfsr[kk+1] & LOWER_MASK);
				this.ptgfsr[kk] = this.ptgfsr[kk + M] ^ (y >> 1) ^ this.mag01[y & 0x1];
			}
			for (; kk < N-1; kk++) {
				y = (this.ptgfsr[kk] & UPPER_MASK) | (this.ptgfsr[kk+1] & LOWER_MASK);
				this.ptgfsr[kk] = this.ptgfsr[kk + (M-N)] ^ (y >> 1) ^ this.mag01[y & 0x1];
			}
			y = (this.ptgfsr[N-1] & UPPER_MASK) | (ptgfsr[0] & LOWER_MASK);
			this.ptgfsr[N-1] = this.ptgfsr[M-1] ^ (y >> 1) ^ this.mag01[y & 0x1];
			this.k = 0;
		}
		y = this.ptgfsr[this.k++];
		y ^= (y >>> 11);
		y ^= (y << 7) & TEMPERING_MASK_B;
		y ^= (y << 15) & TEMPERING_MASK_C;
		y ^= (y >>> 18);
		return y;
	};

	// If an argument is provided, mod by it and return an int.  Else return a
	// float between 0 and 1.
	target.Mersenne.prototype.random = function(limit) {
		if (limit === undefined) {
			return (this._random() * 1.0) / (LOWER_MASK | UPPER_MASK);
		} else {
			return this._random() % limit;
		}
	}
})(window);
