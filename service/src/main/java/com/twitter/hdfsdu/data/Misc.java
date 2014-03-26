package com.twitter.hdfsdu;

import java.io.IOException;
import java.io.StringWriter;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.List;
import java.util.Map;
import java.util.logging.Logger;

import javax.servlet.http.HttpServletRequest;

import org.codehaus.jackson.JsonGenerationException;
import org.codehaus.jackson.map.JsonMappingException;
import org.codehaus.jackson.map.ObjectMapper;

import com.google.common.collect.Lists;
import com.google.common.collect.Maps;
import com.twitter.common.net.http.handlers.TextResponseHandler;

public class Misc extends SizeByPathServlet {
	//TODO: Eventually, if we want more values, this should serve up everything in a 
	//map if we get no parameters but otherwise we can send back only requested values
	@Override
	public Iterable<String> getLines(HttpServletRequest request) {
		List<String> lines = Lists.newLinkedList();
		ObjectMapper mapper = new ObjectMapper();

    try {
			Map<String, String> results = Maps.newHashMap();
			results.put("title", HdfsDu.getTitle());

			StringWriter stringWriter = new StringWriter();
			mapper.writeValue(stringWriter, results);
			lines.add(stringWriter.toString());
		} catch (JsonMappingException e) {
			e.printStackTrace();
		} catch (JsonGenerationException e) {
			e.printStackTrace();
		} catch (IOException e) {
			e.printStackTrace();
		}
		return lines;
	}
}