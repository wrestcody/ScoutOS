resource "aws_cloudwatch_event_rule" "vendor_roster_quarterly" {
  name                = "${var.project_name}-vendor-roster-quarterly-${var.environment}"
  schedule_expression = "cron(0 2 1 1,4,7,10 ? *)" # 1st of Jan/Apr/Jul/Oct at 02:00 UTC
}

resource "aws_cloudwatch_event_target" "vendor_roster_target" {
  rule      = aws_cloudwatch_event_rule.vendor_roster_quarterly.name
  target_id = "lambda"
  arn       = aws_lambda_function.generate_vendor_roster.arn
}

resource "aws_lambda_permission" "allow_events_vendor_roster" {
  statement_id  = "AllowEventInvokeVendorRoster"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.generate_vendor_roster.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.vendor_roster_quarterly.arn
}

