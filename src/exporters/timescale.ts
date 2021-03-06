import * as pg from 'pg';
import * as pgFormat from 'pg-format';
import { Histogram } from '..';

// exports a histogram to timescale given a client - assumes a particular table
// structure.
export const timescale = async (client: pg.Client, timestamp: number, metricName: string, hist: Histogram) => {
	// convert timestamp to iso-8601 
	let time = new Date(timestamp).toISOString();
	const job = 'api';
	// helper function that returns the right value for `le` given a bin index
	const le = (i: number) => (
		(i < hist.bins.length - 1) ? hist.spec.list[i].x : 'Infinity'
	);
	// create the query for ${metricName}_bucket
	const bucketValues = hist.cumulative().bins.map((frequency, i) => ([
		time,
		frequency,
		le(i),
		job
	]));
	const bucketQuery = pgFormat(`INSERT INTO 
			${metricName}_bucket(time, frequency, le, job) 
			VALUES %L;`, bucketValues);
	// create the query for ${metricName}_count
	const countValues = hist.cumulative().bins.map((i, _frequency) => ([
		time,
		hist.total,
		le(i),
		job
	]));
	const countQuery = pgFormat(`INSERT INTO
			${metricName}_count(time, count, le, job) 
			VALUES %L;`, countValues);
	console.log(bucketQuery);
	// issue the queries
	return Promise.all([
		client.query(bucketQuery),
		client.query(countQuery),
	]);
};
