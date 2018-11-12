import React, { Component } from 'react';
import * as d3 from 'd3';

const h = 600;
const w = 700;
const SHAPE_SIZE = 5;
const MAX_DATA_SIZE = 400;

class App extends Component {
  state = {
    socketStatus: 'Connecting...'
  };

  txHashRef = React.createRef();
  data = [];

  componentDidMount = () => {
    this.openConnection();
    this.createSimulation();
  }

  createSimulation = () => {
    const centerX = w / 2;
    const centerY = h / 2;

    this.svg = d3.select('#node')
      .append('svg')
      .attr('width', w)
      .attr('height', h)
      .attr('class', 'simulation');

    this.node = this.svg.append('g')
      .selectAll('circle');

    this.bubbleSimulation = d3.forceSimulation(this.data)
      .force('charge', d3.forceManyBody().strength(-3))
      .force('x', d3.forceX())
      .force('y', d3.forceY())
      .force('collision', d3.forceCollide((d, i) => d.scaledValue * SHAPE_SIZE))
      .alphaTarget(1)
      .on('tick', () => this.onBubblesTick(centerX, centerY));

    this.bubblesRestart();
  }

  onBubblesTick = (centerX, centerY) => {
    this.node
      .attr('cx', (d) => d.x + centerX)
      .attr('cy', (d) => d.y + centerY);
  }

  bubblesRestart = () => {
    const updateSelection = this.node.data(this.data, (d) => d.id); //updated transactions
    updateSelection.exit().remove(); //removed transactions
    const enterSelection = updateSelection.enter()
      .append('circle')
      .attr('r', (d) => d.scaledValue * SHAPE_SIZE)
      .attr('fill', (d) => d3.hsl(180 + Math.min(d.value * 4, 180), 1, 0.5)); //new transactions
    this.node = updateSelection.merge(enterSelection);
    this.bubbleSimulation.nodes(this.data);
    this.bubbleSimulation.alpha(1).restart();
  }

  addTransaction = (e) => {
    const tx = JSON.parse(e.data);

    if (tx.op !== 'utx') return;

    const value = tx.x.out.reduce((s, e) => s + e.value / 10 ** 8, 0);
    const scaledValue = 5 + Math.log(value);
    const id = tx.x.hash;

    this.data.push({
      value,
      scaledValue,
      id
    });

    if (this.data.length > MAX_DATA_SIZE) {
      this.data.shift();
    }

    this.txHashRef.current.innerText = `tx: ${id}`;
    this.bubblesRestart();
  }

  openConnection = () => {
    this.ws = new WebSocket('wss://ws.blockchain.info/inv');
    this.ws.onopen = () => { this.setState({ socketStatus: 'Connected' }); };
    this.ws.onmessage = this.addTransaction;
  }

  closeConnection = () => {
    if (this.ws.readyState === this.ws.OPEN) {
      this.ws.close();
    }
  }

  start = () => {
    this.ws.send('{"op":"unconfirmed_sub"}');
  }

  end = () => {
    this.ws.send('{"op":"unconfirmed_unsub"}');
  }

  componentWillUnmount = () => {
    this.closeConnection();
  }

  render() {
    return (
      <>
        <button onClick={this.start}>Start</button>
        <button onClick={this.end}>Stop</button>
        <span> {this.state.socketStatus}</span>
        <p ref={this.txHashRef}></p>
        <div id="node"></div>
      </>
    );
  }
}

export default App;
