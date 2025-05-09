// selector.js
import {
  getClassNumber,
  getClassLetter,
  getSubjectId,
  getTeacherId,
  getAnalysis,
  getYear,
  getThresholdA,
  getThresholdB,
  getThresholdC,
  getThresholdX,
  getThresholdY,
  getThresholdZ,
  getTypeAnalyze
} from './store.js';

// Функция загрузки учеников, вызывается вручную (например, из analyzeABCData)
export function loadStudents() {
  const sel = document.getElementById('student');
  if (!sel) return;

  sel.innerHTML = '<option value="">— ждём загрузки —</option>';
  sel.disabled = true;

  fetch('/api/students?' + new URLSearchParams({
    class_number: getClassNumber(),
    class_letter: getClassLetter(),
    subject_id:   getSubjectId(),
    teacher_id:   getTeacherId(),
    performance:     getAnalysis()
  }))
    .then(r => r.json())
    .then(arr => {
      sel.innerHTML = '<option value="">— выберите ученика —</option>';
      arr.forEach(s => sel.add(new Option(s.full_name, s.id)));
      sel.disabled = false;
    })
    .catch(err => {
      console.error(err);
      alert('Не удалось загрузить список учеников');
    });
}

// Делаем функцию доступной глобально
window.loadStudents = loadStudents;

document.addEventListener('DOMContentLoaded', () => {
  // ⛔ Не загружаем учеников при старте!

  // Собираем параметры фильтрации
  function buildParams() {
    const formData = new FormData(document.getElementById('filters-form'));
    const p = {};
    for (const [k, v] of formData.entries()) {
      if (v !== '') p[k] = v;
    }

    // дополняем данными из store.js
    p.class_number  = getClassNumber();
    p.class_letter  = getClassLetter();
    p.subject_id    = getSubjectId();
    p.teacher_id    = getTeacherId();
    p.analysis      = getAnalysis();
    p.year_range          = getYear();
    p.thresholds    = JSON.stringify({
      A: getThresholdA(),
      B: getThresholdB(),
      C: getThresholdC(),
      X: getThresholdX(),
      Y: getThresholdY(),
      Z: getThresholdZ()
    });
    p.type_analyze = getTypeAnalyze(); // тип анализа xyz, abc

    if (p.student) {
      p.student_id = p.student;
      delete p.student;
    }
    if (p.period) {
      p.period_range = p.period;
      delete p.period;
    }

    return p;
  }

  // Отрисовка графика по сабмиту формы
  document.getElementById('filters-form').addEventListener('submit', ev => {
    ev.preventDefault();
    const params = buildParams();
    const typeAnalyze = getTypeAnalyze();
    const cfg = ANALYSIS_CONFIG[typeAnalyze];

    fetch('/api/data_request?' + new URLSearchParams(params))
      .then(async response => {
        const data = await response.json();
        if (!response.ok) {
          alert(data.error || 'Ошибка при загрузке данных');
          return;
        }
        const studentId = +document.getElementById('student').value;

        // единый набор вызовов
        drawStudentDynamics(data, studentId, cfg);
        drawCategoryDistribution3D(data, cfg);
        drawGroupThresholdDynamics(data, cfg);
      })
      .catch(err => {
        console.error(err);
        alert('Не удалось получить данные с сервера');
      });
  });
});

////////////////////Г//Р//А//Ф//И//К//И///////////////////////////////////////////////////

// 1) Общая конфигурация для ABC и XYZ
const ANALYSIS_CONFIG = {
  abc: {
    cats: ['A','B','C'],
    colors: { A: '#09ff00', B: '#f2ff00', C: '#ff0000' }
  },
  xyz: {
    cats: ['X','Y','Z'],
    colors: { X: '#09ff00', Y: '#f2ff00', Z: '#ff0000' }
  }
};
// Отрисовка графика динамики определенного ученика
// 3) Универсальная drawStudentDynamics
function drawStudentDynamics(dataByPeriod, studentId, {cats, colors}) {
  const chartDom = document.getElementById('chart_membership_dynamic');
  const chart    = echarts.init(chartDom, 'myLight');

  const periods     = Object.keys(dataByPeriod);
  const studentVals = [];
  const thresholds  = [];
  const categories  = [];
  const barColors   = [];
  const xLabels     = [];
  let studentName   = '';

  // вместо жёсткого CAT_COLOR: берём из параметров
  const CAT_COLOR = colors;

  periods.forEach(period => {
    const recs = dataByPeriod[period] || [];
    const me   = recs.find(r => r.student_id === studentId) || {};
    const val  = me['Баллы']     != null ? me['Баллы']     : 0;
    const thr  = me['Порог']     != null ? me['Порог']     : 0;
    const cat  = me['Категория'] || cats[cats.length-1];
    const name = me['Ученики']   || '';

    if (!studentName && name) studentName = name;

    studentVals.push(val);
    thresholds .push(thr);
    categories .push(cat);
    barColors  .push(CAT_COLOR[cat] || '#ccc');
    xLabels    .push(`${period}\nКат: ${cat}`);
  });

  const option = {
    title: {
      text: 'Динамика принадлежности ученика к группе',
      left: 'center'
    },
    grid: {
      left: '10%',
      right: '20%',
      top: '15%',
      bottom: '15%'
    },
    tooltip: {
      trigger: 'axis',
      formatter: params => {
        const idx = params[0].dataIndex;
        return `Категория: ${categories[idx]}<br>Порог: ${thresholds[idx]}<br>Баллы ${studentName}: ${studentVals[idx]}`;
      }
    },
    legend: {
      orient: 'vertical',
      right: '10%',
      top: 'center',
      data: [
        { name: 'Пороговый балл' },
        { name: studentName, textStyle: { color: 'red' } },
        { name: 'Категория' }
      ]
    },
    xAxis: {
      type: 'category',
      data: xLabels,
      axisLabel: {
        interval: 0,
        rotate: 30
      },
      axisTick: {
        alignWithLabel: true
      }
    },
    yAxis: {
      type: 'value'
    },
    series: [
      {
        name: 'Категория',
        type: 'bar',
        data: studentVals,
        barGap: '-100%',
        barWidth: '60%',
        itemStyle: {
          color: params => barColors[params.dataIndex]
        },
        z: 1
      },
      {
        name: 'Пороговый балл',
        type: 'line',
        data: thresholds,
        symbol: 'rect',
        symbolSize: 8,
        lineStyle: { color: '#000', width: 2 },
        itemStyle: { color: '#000' },
        label: {
          show: true,
          position: 'top',
          color: '#000',
          formatter: '{c}'
        },
        z: 2
      },
      {
        name: studentName,
        type: 'line',
        data: studentVals,
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: { color: 'red', width: 2 },
        itemStyle: { color: 'red' },
        label: {
          show: true,
          position: 'top',
          color: 'red',
          formatter: '{c}'
        },
        z: 3
      }
    ]
  };

  chart.setOption(option);
}


// === Универсальная функция 2: 3D-распределение ===
function drawCategoryDistribution3D(dataByPeriod, {cats, colors}) {
  const chartDom = document.getElementById('chart_distribution_bar');
  const chart    = echarts.init(chartDom, 'myLight');

  const periods = Object.keys(dataByPeriod);

  // 1) общее число по каждой категории
  const totalCounts = cats.reduce((acc, cat) => {
    acc[cat] = periods.reduce((sum, period) => {
      const recs = dataByPeriod[period] || [];
      return sum + recs.filter(r => r.Категория === cat).length;
    }, 0);
    return acc;
  }, {});

  // 2) сортировка категорий по возрастанию totalCounts
  const sortedCats = cats.slice().sort((a, b) => totalCounts[a] - totalCounts[b]);

  // 3) сбор данных [x,y,value]
  const data3d = [];
  periods.forEach((period, i) => {
    const recs = dataByPeriod[period] || [];
    sortedCats.forEach((cat, j) => {
      const cnt = recs.filter(r => r.Категория === cat).length;
      data3d.push([i, j, cnt]);
    });
  });

  // цвета из параметров
  const categoryColors = colors;

  const option = {
    title: {
      text: 'Распределение учеников по группам',
      left: 'center'
    },
    tooltip: {
      formatter: params => {
        const [i, j, v] = params.data;
        return `${periods[i]}<br>Группа ${sortedCats[j]}: ${v}`;
      }
    },
    xAxis3D: {
      type: 'category',
      name: 'Период',
      data: periods
    },
    yAxis3D: {
      type: 'category',
      name: 'Группа',
      data: sortedCats
    },
    zAxis3D: {
      type: 'value',
      name: 'Число учеников'
    },
    grid3D: {
      boxWidth: 100,
      boxDepth: 50,
      viewControl: {
        projection: 'orthographic'
      },
      light: {
        main: { intensity: 1.2, shadow: true },
        ambient: { intensity: 0.3 }
      }
    },
    series: [{
      type: 'bar3D',
      data: data3d,
      shading: 'lambert',
      itemStyle: {
        color: params => {
          const cat = sortedCats[params.data[1]];
          return categoryColors[cat] || '#999';
        }
      },
      label: {
        show: true,
        formatter: ({ value }) => value[2],
        textStyle: { fontSize: 12, borderWidth: 1 }
      }
    }]
  };

  chart.setOption(option);
}


// === Универсальная функция 3: динамика порогов ===
function drawGroupThresholdDynamics(dataByPeriod, {cats, colors}) {
  const chartDom = document.getElementById('chart_threshold_dynamic');
  const chart    = echarts.init(chartDom, 'myLight');

  const periods = Object.keys(dataByPeriod);
  // рисуем снизу→вверх: обратный порядок cats
  const stackCats = cats.slice().reverse();
  const baseColors = colors;

  // собираем seriesData: для каждой группы макс.Порог
  const seriesData = stackCats.map(cat => {
    return periods.map(period => {
      const recs = dataByPeriod[period] || [];
      const vals = recs.filter(r => r.Категория === cat).map(r => r.Порог || 0);
      return vals.length ? Math.max(...vals) : 0;
    });
  });

  // генерим градиенты
  const gradients = stackCats.map(cat => {
    const c = baseColors[cat];
    return new echarts.graphic.LinearGradient(0, 0, 0, 1, [
      { offset: 0, color: c.replace(')', ', 0.8)').replace('rgb', 'rgba') },
      { offset: 1, color: c.replace(')', ', 0.2)').replace('rgb', 'rgba') }
    ]);
  });

  const option = {
    title: {
      text: 'Динамика порогового балла в группах',
      left: 'center',
      textStyle: { fontSize: 18, fontWeight: '500' }
    },
    animationDuration: 1200,
    animationEasing: 'cubicOut',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(50,50,50,0.7)',
      textStyle: { color: '#fff' },
      formatter: params => {
        let t = `<strong>${params[0].axisValue}</strong><br/>`;
        params.slice().reverse().forEach(p => {
          t += `<span style="display:inline-block;margin-right:5px;
                 width:10px;height:10px;background-color:${p.color};"></span>`
             + `${p.seriesName}: ${p.data}<br/>`;
        });
        return t;
      }
    },
    legend: {
      bottom: 0,
      itemGap: 20,
      textStyle: { fontSize: 13 }
    },
    grid: {
      left: '8%',
      right: '6%',
      top: '15%',
      bottom: '18%'
    },
    xAxis: {
      type: 'category',
      data: periods,
      boundaryGap: false,
      axisLine: { lineStyle: { color: '#aaa' } },
      axisTick: { show: false },
      axisLabel: { fontSize: 12 },
      splitLine: { show: true, lineStyle: { color: '#eee' } }
    },
    yAxis: {
      type: 'value',
      name: 'Пороговый балл',
      nameLocation: 'middle',
      nameGap: 40,
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: '#eee' } },
      axisLabel: { show: false }
    },
    series: stackCats.map((cat, idx) => ({
      name: `Группа ${cat}`,
      type: 'line',
      stack: 'total',
      smooth: true,
      symbol: 'circle',
      symbolSize: 8,
      showSymbol: true,
      areaStyle: { opacity: 1, color: gradients[idx] },
      emphasis: { focus: 'series', itemStyle: { borderColor: '#333', borderWidth: 2 } },
      lineStyle: { width: 2, color: baseColors[cat] },
      itemStyle: { color: baseColors[cat] },
      label: { show: true, position: 'top', formatter: '{c}', fontSize: 12, color: baseColors[cat] },
      data: seriesData[idx]
    }))
  };

  chart.setOption(option);
}