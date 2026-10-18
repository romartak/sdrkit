/* Fake librtlsdr for tests: behaves like an RTL-SDR Blog V3 (R820T tuner) or, with FAKE_RTL_TUNER=6,
 * like a V4 (R828D). No USB involved; read_sync returns noise plus a carrier. */
#include <stdint.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>

static uint32_t fc, fs;
static int ds, ds_calls;
static double ph;

static int tuner(void) { const char *t = getenv("FAKE_RTL_TUNER"); return t ? atoi(t) : 5; }

uint32_t rtlsdr_get_device_count(void) { return 1; }
int rtlsdr_get_device_usb_strings(uint32_t i, char *m, char *p, char *s) {
  strcpy(m, "RTLSDRBlog"); strcpy(p, tuner() == 6 ? "Blog V4" : "Blog V3"); strcpy(s, "00000001"); return 0;
}
int rtlsdr_open(void **d, uint32_t i) { *d = (void *)1; ds = 0; ds_calls = 0; return 0; }
int rtlsdr_close(void *d) { return 0; }
int rtlsdr_set_sample_rate(void *d, uint32_t r) { fs = r; return 0; }
int rtlsdr_set_center_freq(void *d, uint32_t f) { fc = f; return 0; }
int rtlsdr_set_freq_correction(void *d, int p) { return 0; }
int rtlsdr_set_tuner_gain_mode(void *d, int m) { return 0; }
int rtlsdr_set_tuner_gain(void *d, int g) { return 0; }
static const int G[] = {0, 9, 14, 27, 37, 77, 87, 125, 144, 157, 166, 197, 207, 229, 254, 280, 297, 328, 338, 364,
                        372, 386, 402, 421, 434, 439, 445, 480, 496};
int rtlsdr_get_tuner_gains(void *d, int *g) { if (g) memcpy(g, G, sizeof G); return (int)(sizeof G / sizeof G[0]); }
int rtlsdr_get_tuner_type(void *d) { return tuner(); }
int rtlsdr_set_agc_mode(void *d, int o) { return 0; }
int rtlsdr_set_direct_sampling(void *d, int o) { ds = o; ds_calls++; return 0; }
int rtlsdr_reset_buffer(void *d) { return 0; }
int rtlsdr_set_bias_tee(void *d, int o) { return 0; }
int rtlsdr_read_sync(void *d, void *buf, int len, int *n) {
  uint8_t *b = buf;
  for (int k = 0; k + 1 < len; k += 2) {
    ph += M_PI / 4;
    b[k] = (uint8_t)(127.5 + 20 * cos(ph) + (rand() % 9 - 4));
    b[k + 1] = (uint8_t)(127.5 + 20 * sin(ph) + (rand() % 9 - 4));
  }
  *n = len;
  return 0;
}

/* what the test inspects */
int fake_direct_sampling(void) { return ds; }
int fake_direct_sampling_calls(void) { return ds_calls; }
uint32_t fake_center_freq(void) { return fc; }
uint32_t fake_sample_rate(void) { return fs; }
