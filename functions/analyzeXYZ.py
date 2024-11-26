import math
import pandas as pd

def calculate_stddev(values):
    mean_value = sum(values) / len(values)
    variance = sum((x - mean_value) ** 2 for x in values) / len(values)
    return math.sqrt(variance)

def analyzeXYZ_data(data, thresholdX, thresholdY, thresholdZ, start_col, end_col):
    table_data = data['data']
    columns = data['columns']

    # Найти индексы указанных столбцов
    start_idx = columns.index(start_col)
    end_idx = columns.index(end_col) + 1

    # Вычислить сумму указанного диапазона столбцов для каждого ученика
    measure_data = []
    for row in table_data:
        student = row[1]
        values = [float(row[i]) for i in range(start_idx, end_idx) if row[i] != '']
        if values:  # Убедиться, что список не пуст
            mean_value = sum(values) / len(values)
            stddev_value = calculate_stddev(values)
            ratio_variation = stddev_value / mean_value * 100 if mean_value != 0 else 0
            analysis_measure = sum(values)
        else:
            mean_value = 0
            stddev_value = 0
            ratio_variation = 0
        measure_data.append((student, analysis_measure, ratio_variation))

    # Отсортировать данные на основе коэффициента вариации
    measure_data.sort(key=lambda x: x[2], reverse=True)

    result = []

    for i, (student, value, ratio_variation) in enumerate(measure_data):

        if ratio_variation <= thresholdX:
            category = 'X'
        elif ratio_variation <= (thresholdX + thresholdY):
            category = 'Y'
        else:
            category = 'Z'

        ration_var = '{:.2f}%'.format(ratio_variation)

        result.append({
            '№': i + 1,
            'Ученики': student,
            'Анализируемый период': value,
            'Коэффициент вариации': ration_var,
            'Категория': category
        })

    df_result = pd.DataFrame(result)

    return df_result.to_dict(orient='records')