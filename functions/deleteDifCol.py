import re

MONTHS = {
    "Январь": 1, "Февраль": 2, "Март": 3, "Апрель": 4,
    "Май": 5, "Июнь": 6, "Июль": 7, "Август": 8,
    "Сентябрь": 9, "Октябрь": 10, "Ноябрь": 11, "Декабрь": 12
}

# кварталы
_QUARTER_RE = re.compile(r"^([1-4])\s+четверть(?:\s+(\d{4}))?$", flags=re.IGNORECASE)
# полугодия: "1 полугодие", "2 полугодие", с опциональным годом
_HALF_RE    = re.compile(r"^([12])\s+полугодие(?:\s+(\d{4}))?$", flags=re.IGNORECASE)

def parse_col(name):
    name = name.strip()
    # 1) все кварталы → other
    if _QUARTER_RE.match(name):
        return 'other', None, None, None

    # 2) все полугодия → other
    if _HALF_RE.match(name):
        return 'other', None, None, None
    m = re.match(r"^(\d{1,2})\s+([А-ЯЁа-яё]+)\s+(\d{4})$", name)
    if m:  
        return 'full',int(m.group(3)), MONTHS[m.group(2)], int(m.group(1))
    m = re.match(r"^([А-ЯЁа-яё]+)\s+(\d{4})$", name)
    if m:  
        return 'monthYear', int(m.group(2)), MONTHS[m.group(1)], None
    m = re.match(r"^(\d{4})$", name)
    if m:  
        return 'year',int(m.group(1)), None,None
    m = re.match(r"^(\d{1,2})\s+([А-ЯЁа-яё]+)$", name)
    if m:  
        return 'dayMonth', None, MONTHS[m.group(2)], int(m.group(1))
    if name in MONTHS:
        return 'month',None,MONTHS[name], None
    return 'other', None, None, None

def prune_columns(data, start_col, end_col, columns_string='columns', data_string='data'):
    cols = data[columns_string]
    rows = data[data_string]
    try:
        i0 = cols.index(start_col)
        # последний индекс совпадения end_col
        i1 = len(cols) - 1 - cols[::-1].index(end_col)
    except ValueError:
        # если не нашли — сразу возвращаем оригинал
        return data
    t0, y0, m0, d0 = parse_col(start_col)
    t1, y1, m1, d1 = parse_col(end_col)

    if t0 == 'other' or t1 == 'other' or all(parse_col(c)[0]=='other' for c in cols):
        return data

    keep = []
    for idx, col in enumerate(cols):
        # всегда №, Ученики и итоговые
        if idx < 2 or col in ("Средняя оценка","Оценка за период","Итог за период"):
            keep.append(idx)
            continue

        # вне интервала — оставляем
        if idx <= i0 or idx >= i1:
            keep.append(idx)
            continue

        t, y, m, d = parse_col(col)

        # === существующие 6 веток ===
        # 1) start=month, end=month → удаляем дни и full
        if t0 == 'month' and t1 == 'month':
            if t in ('dayMonth','full'):
                continue
            keep.append(idx)

        # 2) start=dayMonth, end=month → из дней следующего месяца
        elif t0 == 'dayMonth' and t1 == 'month':
            if t in ('dayMonth','full') and m > m0 or t == 'month' and m == m0:
                continue
            keep.append(idx)

        # 3) start=dayMonth, end=dayMonth → удаляем любые month* и monthYear
        elif t0 == 'dayMonth' and t1 == 'dayMonth':
            if t in ('month','monthYear'):
                continue
            keep.append(idx)

        # 4) start=month, end=dayMonth → то же самое
        elif t0 == 'month' and t1 == 'dayMonth':
            if t in ('month','monthYear'):
                continue
            keep.append(idx)

        # 5) start=year, end=year → удаляем любые даты/месяцы внутри того же года
        elif t0 == 'year' and t1 == 'year':
            if y == y0 and t in ('dayMonth','month','monthYear','full'):
                continue
            keep.append(idx)

        # 6) start=year, end=monthYear → удаляем все full, 
        #    удаляем monthYear==y1 и year==y1
        elif t0 == 'year' and t1 == 'monthYear':
            # «дни Месяца Года» = full
            if t == 'full':
                continue
            # сам столбец Год2
            if t == 'year' and y == y1:
                continue
            keep.append(idx)

        # === новые 4 ветки ===
        elif t0=='monthYear' and t1=='year':
            # убираем все full внутри
            if t in ('full', 'year'):
                continue
            keep.append(idx)

        elif t0=='year' and t1=='full':
            # убираем все monthYear внутри
            if t=='monthYear':
                continue
            keep.append(idx)

        elif t0=='full' and t1=='year':
            # убираем и full, и monthYear между ними
            if t in ('monthYear', 'year') and y==y0 or t in('full','monthYear') and y==y1:
                continue
            keep.append(idx)

        elif t0=='full' and t1=='full':
            # убираем только monthYear между двумя full
            if t in ('monthYear', 'year') :
                continue
            keep.append(idx)

    new_cols = [cols[i] for i in keep]
    new_data = [[r[i]    for i in keep] for r in rows]
    return {columns_string: new_cols, data_string: new_data}