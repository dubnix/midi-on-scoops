scribble = require('scribbletune')
reducer = require('../lib/reducer')

describe 'reducer', ->
  it 'can resolve expressions', ->
    context =
      '%a': 'a2'
      '%x': ['%a', ['a2', 'b2']]
      '%Am': [['a3', 'c4', 'e3']]
      '%Cm': ['c3', 'd#3', 'g3']

    expect(reducer([
      {type: 'note', value: 'g1'},
      {type: 'multiply', value: 7},
      {type: 'note', value: 'f1', repeat: 2}
    ], context)).toEqual ['g1', 'g1', 'g1', 'g1', 'g1', 'g1', 'g1', 'f1', 'f1']

    expect(reducer([
      {type: 'param', value: '%Am'}
      {type: 'param', value: '%x'}
    ], context)).toEqual [
      context['%Am'][0]
      'a2'
      ['a2', 'b2']
    ]

    expect(reducer([
      {type: 'chord', value: scribble.chord('Fm-3'), unfold: true}
      {type: 'slice', value: [0, 2]}
      {type: 'note', value: 'd3'}
    ], context)).toEqual ['F3', 'Ab3', 'd3']

    expect(reducer([
      {type: 'number', value: 5}
      {type: 'number', value: [100, 120]}
    ], context)).toEqual [5, 100, 120]

    expect(reducer([
      {type: 'number', value: 5}
      {type: 'range', value: [10, 120]}
      {type: 'divide', value: 11}
    ], context)).toEqual [5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120]

    expect(reducer([
      {type: 'range', value: [0, 2]}
    ])).toEqual [0, 1, 2]

    expect(reducer([
      {type: 'range', value: [0, 2]}
      {type: 'multiply', value: 2}
    ])).toEqual [0, 1, 2, 0, 1, 2]

    expect(reducer([
      {type: 'note', value: 'c3'}
      {type: 'multiply', value: 2}
    ])).toEqual ['c3', 'c3']

    expect(reducer([
      {type: 'pattern', value: 'x---'}
      {type: 'multiply', value: 4}
    ])).toEqual ['x---', 'x---', 'x---', 'x---']

    expect(reducer([
      {type: 'number', value: [1, 2, 3, 4, 5]}
      {type: 'divide', value: 2}
    ])).toEqual [1 / 2, 2 / 2, 3 / 2, 4 / 2, 5 / 2]

    # FIXME: how apply filtering?

    expect(reducer([
      {type: 'scale', value: scribble.scale('C2 phrygian')}
      {type: 'divide', value: 2}
    ])).toEqual [['C2', 'Db2', 'Eb2', 'F2', 'G2', 'Ab2', 'Bb2']]

    expect(reducer([
      {type: 'progression', value: scribble.progression('D4 minor', 'I IV V ii')}
      {type: 'slice', value: [0, 2]}
    ])).toEqual ['DM-4 GM-4 AM-4 Em-4']

    # FIXME: consider dividing the octave or midi-value (?)
    # expect(reducer([
    #   {type: 'chord', value: ['c2', 'e3', 'g2']}
    #   {type: 'divide', value: 2}
    # ])).toEqual []

    # expect(reducer([
    #   {type: 'note', value: 'c4'}
    #   {type: 'divide', value: 2}
    # ])).toEqual []

    expect(reducer([
      {type: 'note', value: 'c3', repeat: 3}
    ])).toEqual ['c3', 'c3', 'c3']
