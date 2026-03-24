const fs = require('fs');
const path = require('path');

// Load the module after setting up DOM mocks

describe('src/index.js unit tests', () => {
  let index;
  let mockResultEl;
  let mockStatusEl;

  beforeEach(() => {
    // Mock simple DOM elements
    mockResultEl = { innerHTML: '' };
    mockStatusEl = { textContent: '' };

    global.document = {
      getElementById: (id) => {
        if (id === 'result') return mockResultEl;
        if (id === 'status') return mockStatusEl;
        // minimal placeholders
        return { value: '', addEventListener: () => {} };
      }
    };

    // Mock localStorage
    const store = {};
    global.localStorage = {
      getItem: (k) => store[k] || null,
      setItem: (k, v) => { store[k] = v; },
      removeItem: (k) => { delete store[k]; }
    };

    // Reset require cache and load module
    jest.resetModules();
    index = require('../src/index.js');
  });

  test('getCache returns null when no cached item', () => {
    expect(index.getCache('nonexistent')).toBeNull();
  });

  test('setCache stores structured data and getCache returns parsed data', () => {
    index.setCache('k1', { a: 1 });
    const raw = global.localStorage.getItem('k1');
    expect(typeof raw).toBe('string');

    const parsed = index.getCache('k1');
    expect(parsed).toEqual({ a: 1 });
  });

  test('weatherIconSvg returns different SVGs for codes', () => {
    const svg0 = index.weatherIconSvg(0);
    expect(svg0).toContain('<circle');

    const svg2 = index.weatherIconSvg(2);
    expect(svg2).toContain('path');

    const svg50 = index.weatherIconSvg(50);
    expect(svg50).toContain('stroke');

    const svg73 = index.weatherIconSvg(73);
    expect(svg73).toContain('M6 16');

    const svg96 = index.weatherIconSvg(96);
    expect(svg96).toContain('stroke="#E53935"');

    const svgu = index.weatherIconSvg(999);
    expect(svgu).toContain('fill="#B0BEC5"');
  });

  test('showResult renders city, country and weather values', () => {
    index.showResult('Madrid', 'ES', { temperature: 20, humidity: 50, wind: 10, precipitation: 0 });
    expect(mockResultEl.innerHTML).toContain('Madrid, ES');
    expect(mockResultEl.innerHTML).toContain('20');
    expect(mockResultEl.innerHTML).toContain('50%');
  });

  test('showForecast appends 5-day forecast HTML', () => {
    const forecast = [
      { date: '2026-01-01', max: 10, min: 1 },
      { date: '2026-01-02', max: 11, min: 2 },
      { date: '2026-01-03', max: 12, min: 3 },
      { date: '2026-01-04', max: 13, min: 4 },
      { date: '2026-01-05', max: 14, min: 5 }
    ];

    mockResultEl.innerHTML = '<div>existing</div>';
    index.showForecast(forecast);
    expect(mockResultEl.innerHTML).toContain('Pronóstico 5 días');
    expect(mockResultEl.innerHTML).toContain('2026-01-01');
    expect(mockResultEl.innerHTML).toContain('Máx: 14');
  });

  test('fetchForecast calls fetch and returns 5-day forecast', async () => {
    const fakeResponse = {
      ok: true,
      json: async () => ({
        daily: {
          time: ['d1','d2','d3','d4','d5','d6'],
          temperature_2m_max: [1,2,3,4,5,6],
          temperature_2m_min: [0,0,0,0,0,0]
        }
      })
    };

    global.fetch = jest.fn().mockResolvedValue(fakeResponse);

    const res = await index.fetchForecast(1,2);
    expect(Array.isArray(res)).toBe(true);
    expect(res.length).toBe(5);
    expect(res[0]).toEqual({ date: 'd1', max: 1, min: 0 });
  });

});
