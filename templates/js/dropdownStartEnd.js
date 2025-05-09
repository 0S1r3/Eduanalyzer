document.addEventListener('DOMContentLoaded', () => {
    const startSel = document.getElementById('startQuarter');
    const endSel   = document.getElementById('endQuarter');

    const MONTHS = {
        "Январь": 0,  "Февраль": 1, "Март": 2,   "Апрель": 3,
        "Май": 4,     "Июнь": 5,    "Июль": 6,    "Август": 7,
        "Сентябрь": 8,"Октябрь": 9, "Ноябрь": 10, "Декабрь": 11
    };

    function parseValue(str) {
        const s = str.trim();
        let m;
        if (m = s.match(/^(\d{1,2})\s+([А-ЯЁа-яё]+)\s+(\d{4})$/))
            return { day: +m[1], month: MONTHS[m[2]] ?? null, year: +m[3] };
        if (m = s.match(/^([А-ЯЁа-яё]+)\s+(\d{4})$/))
            return { day: null, month: MONTHS[m[1]] ?? null, year: +m[2] };
        if (m = s.match(/^(\d{4})$/))
            return { day: null, month: null, year: +m[1] };
        if (m = s.match(/^(\d{1,2})\s+([А-ЯЁа-яё]+)$/))
            return { day: +m[1], month: MONTHS[m[2]] ?? null, year: null };
        return null;
    }

    function compareDates(a, b) {
        if (!a||!b) return 0;
        if ((a.year||0)!==(b.year||0)) return (a.year||0)-(b.year||0);
        const ma = a.month!=null?a.month:-1,
              mb = b.month!=null?b.month:-1;
        if (ma!==mb) return ma-mb;
        return (a.day||0)-(b.day||0);
    }

    function getType(v) {
        if (!v) return 'none';
        if (v.year && v.month!=null && v.day!=null) return 'full';
        if (v.year && v.month!=null) return 'monthYear';
        if (v.year) return 'year';
        if (v.month!=null && v.day!=null) return 'dayMonth';
        if (v.month!=null) return 'month';
        return 'none';
    }

    function updateOptions() {
        const sv = parseValue(startSel.value),
              ev = parseValue(endSel.value),
              st = getType(sv),
              et = getType(ev);

        // блокируем endSel (нельзя раньше start)
        endSel.querySelectorAll('option').forEach(opt => {
            const p = parseValue(opt.value);
            let disable = false;
            if (p && st!=='none') {
                switch (st) {
                  case 'full':
                    if (compareDates(sv, p) > 0) disable = true;
                    break;
                  case 'monthYear':
                    if (p.year < sv.year || (p.year === sv.year && p.month <= sv.month))
                        disable = true;
                    break;
                  case 'year':
                    if (p.year <= sv.year) disable = true;
                    break;
                  case 'dayMonth':
                    if (p.month < sv.month
                        || (p.month === sv.month && (
                               p.day == null               // просто "Сентябрь"
                            || p.day <= sv.day            // дни ≤ выбранного
                        ))
                    ) disable = true;
                    break;
                  case 'month':
                    if (p.month <= sv.month) disable = true;
                    break;
                }
            }
            opt.disabled = disable;
        });

        // блокируем startSel (нельзя позже end)
        startSel.querySelectorAll('option').forEach(opt => {
            const p = parseValue(opt.value);
            let disable = false;
            if (p && et!=='none') {
                switch (et) {
                  case 'full':
                    if (compareDates(p, ev) > 0) disable = true;
                    break;
                  case 'monthYear':
                    if (p.year > ev.year || (p.year === ev.year && p.month >= ev.month))
                        disable = true;
                    break;
                  case 'year':
                    if (p.year >= ev.year) disable = true;
                    break;
                  case 'dayMonth':
                    if (p.month > ev.month
                        || (p.month === ev.month && (
                               p.day == null      // просто "Сентябрь"
                            || p.day >= ev.day
                        ))
                    ) disable = true;
                    break;
                  case 'month':
                    if (p.month >= ev.month) disable = true;
                    break;
                }
            }
            opt.disabled = disable;
        });
    }

    startSel.addEventListener('change', updateOptions);
    endSel.addEventListener('change', updateOptions);
    updateOptions();
});
